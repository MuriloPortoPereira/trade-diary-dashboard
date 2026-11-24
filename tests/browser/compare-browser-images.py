# Comparador de imagens PNG para checagens visuais no Chrome headless.
#
# Objetivo:
#   Limitar falsos positivos causados por ruído mínimo de rasterização/antialiasing
#   nas bordas entre capturas do mesmo código no Chrome, exigindo Pillow apenas
#   quando comparações visuais opcionais são executadas.
#
# Papel na verificação visual:
#   Invocado por `shell-style-check.cjs` somente quando o hash binário de dois PNGs
#   diverge mesmo com estado, geometria, estilos computados e fontes idênticos.
#
# Pontos-chave:
#   - Exige imagens RGB de exatamente o mesmo tamanho.
#   - Aceita a diferença apenas se houver no máximo 64 pixels divergentes, no máximo
#     20 pixels com delta de canal > 1 e delta máximo de canal <= 20 (de 255).
"""Limita ruído de rasterização de bordas do Chrome; requer Pillow apenas para checagens visuais opcionais."""
import json
import sys
from PIL import Image, ImageChops


# Compara pixel a pixel duas capturas RGB e retorna métricas de divergência e flag `accepted`.
def compare(before_path, after_path):
    with Image.open(before_path) as before, Image.open(after_path) as after:
        # Garante compatibilidade estrutural antes de calcular a diferença de canais.
        if before.size != after.size or before.mode != 'RGB' or after.mode != 'RGB':
            raise ValueError('Expected equally sized RGB Chrome screenshots')
        difference = ImageChops.difference(before, after)
        bounds = difference.getbbox()
        # Recorta apenas a caixa delimitadora onde há diferença para economizar leitura.
        values = list(difference.crop(bounds).getdata()) if bounds else []
        peaks = [max(pixel) for pixel in values if any(pixel)]
        result = {'pixels': len(peaks), 'strongPixels': sum(peak > 1 for peak in peaks),
                  'maxChannelDelta': max(peaks, default=0)}
        # Controles executados no mesmo código apresentaram diferenças esparsas de antialiasing de até 20/255.
        # Comparações de estado, geometria e fontes permanecem exatas no runner Node.
        result['accepted'] = (result['pixels'] <= 64 and result['strongPixels'] <= 20
                              and result['maxChannelDelta'] <= 20)
        return result


# Ponto de entrada CLI: imprime o resultado em JSON e encerra com código 0 (aceito) ou 1 (rejeitado).
if __name__ == '__main__':
    result = compare(*sys.argv[1:])
    print(json.dumps(result))
    sys.exit(0 if result['accepted'] else 1)
