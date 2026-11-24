// Presentation fixture for legacy upload-zone styles; no application data or IO.
function resetUploadZoneStyleState() {
  document.getElementById('styleUploadZoneFixture')?.remove();
}

function prepareUploadZoneStyleScenario(name) {
  const fixture = document.createElement('div');
  fixture.id = 'styleUploadZoneFixture';
  fixture.className = 'upload-zone';
  fixture.innerHTML = '<input type="file"><div class="upload-icon">+</div><div class="upload-title">Upload</div><div class="upload-sub">CSV</div>';
  document.getElementById('page-dashboard')?.append(fixture);
  if (!fixture.isConnected) throw new Error('Upload zone fixture was not mounted');
  if (name === 'upload-zone-drag') fixture.classList.add('drag');
  fixture.scrollIntoView({block: 'center'});

  const zoneStyle = getComputedStyle(fixture);
  const inputStyle = getComputedStyle(fixture.querySelector('input'));
  const iconStyle = getComputedStyle(fixture.querySelector('.upload-icon'));
  const titleStyle = getComputedStyle(fixture.querySelector('.upload-title'));
  const subStyle = getComputedStyle(fixture.querySelector('.upload-sub'));
  if (zoneStyle.padding !== '32px' || zoneStyle.borderRadius !== '8px' || zoneStyle.textAlign !== 'center' ||
    inputStyle.display !== 'none' || iconStyle.width !== '48px' || iconStyle.height !== '48px' ||
    iconStyle.marginBottom !== '12px' || iconStyle.borderRadius !== '16px' || titleStyle.fontSize !== '14px' ||
    titleStyle.fontWeight !== '700' || subStyle.marginTop !== '4px' || subStyle.fontSize !== '11px') {
    throw new Error('Upload zone styles changed');
  }
  if (name === 'upload-zone-drag' &&
    (zoneStyle.backgroundColor !== 'rgba(34, 213, 237, 0.06)' || zoneStyle.borderColor !== 'rgba(34, 213, 237, 0.28)')) {
    throw new Error('Upload zone drag styles changed');
  }
  return name === 'upload-zone-hover' ? '#styleUploadZoneFixture' : null;
}

module.exports = {resetUploadZoneStyleState, prepareUploadZoneStyleScenario};
