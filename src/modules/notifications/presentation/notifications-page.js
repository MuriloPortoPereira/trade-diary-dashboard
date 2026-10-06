function renderNotificationsPage(){
  const acct=getActiveAccount();
  const alerts=buildOperationalAlerts(acct,getAccountTrades(activeAccountId)).map(alert=>({
    ...alert,
    summary:alert.summary,
  }));
  renderStatusList('notificationFeed',alerts,'Tudo dentro do esperado agora.');
}
