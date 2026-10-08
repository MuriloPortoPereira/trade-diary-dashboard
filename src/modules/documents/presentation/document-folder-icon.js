function renderDocFolderIcon(type){
  const icons={
    plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/></svg>',
    file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h6l4 4v14H6V3h2Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    folder:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>',
  };
  return `<span class="doc-folder-icon">${icons[type]||icons.file}</span>`;
}
