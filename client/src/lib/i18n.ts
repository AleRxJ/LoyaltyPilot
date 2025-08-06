const translations = {
  en: {
    common: {
      dashboard: "Dashboard",
      deals: "My Deals",
      rewards: "Rewards",
      reports: "Reports",
      profile: "Profile",
      logout: "Logout",
      login: "Login",
      register: "Register",
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      approve: "Approve",
      reject: "Reject",
      loading: "Loading...",
      error: "Error",
      success: "Success",
    },
    dashboard: {
      welcome: "Welcome back",
      partnerLevel: "Partner Level",
      totalPoints: "Total Points",
      activeDeals: "Active Deals",
      availablePoints: "Available Points",
      pendingDeals: "Pending Deals",
      redeemedRewards: "Redeemed Rewards",
      monthlyEarnings: "Monthly Earnings",
      recentDeals: "Recent Deals",
      quickActions: "Quick Actions",
      availableRewards: "Available Rewards",
      registerNewDeal: "Register New Deal",
      browseRewards: "Browse Rewards",
      viewReports: "View Reports",
    },
    deals: {
      newDeal: "New Deal",
      dealValue: "Deal Value",
      productType: "Product Type",
      productName: "Product Name",
      quantity: "Quantity/Licenses",
      closeDate: "Close Date",
      clientInfo: "Client Information",
      status: "Status",
      points: "Points",
      approved: "Approved",
      pending: "Pending",
      rejected: "Rejected",
    },
  },
  es: {
    common: {
      dashboard: "Panel de Control",
      deals: "Mis Tratos",
      rewards: "Recompensas",
      reports: "Reportes",
      profile: "Perfil",
      logout: "Cerrar Sesión",
      login: "Iniciar Sesión",
      register: "Registrarse",
      submit: "Enviar",
      cancel: "Cancelar",
      save: "Guardar",
      edit: "Editar",
      delete: "Eliminar",
      approve: "Aprobar",
      reject: "Rechazar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
    },
    dashboard: {
      welcome: "Bienvenido de vuelta",
      partnerLevel: "Nivel de Socio",
      totalPoints: "Puntos Totales",
      activeDeals: "Tratos Activos",
      availablePoints: "Puntos Disponibles",
      pendingDeals: "Tratos Pendientes",
      redeemedRewards: "Recompensas Canjeadas",
      monthlyEarnings: "Ganancias Mensuales",
      recentDeals: "Tratos Recientes",
      quickActions: "Acciones Rápidas",
      availableRewards: "Recompensas Disponibles",
      registerNewDeal: "Registrar Nuevo Trato",
      browseRewards: "Explorar Recompensas",
      viewReports: "Ver Reportes",
    },
    deals: {
      newDeal: "Nuevo Trato",
      dealValue: "Valor del Trato",
      productType: "Tipo de Producto",
      productName: "Nombre del Producto",
      quantity: "Cantidad/Licencias",
      closeDate: "Fecha de Cierre",
      clientInfo: "Información del Cliente",
      status: "Estado",
      points: "Puntos",
      approved: "Aprobado",
      pending: "Pendiente",
      rejected: "Rechazado",
    },
  },
  pt: {
    common: {
      dashboard: "Painel de Controle",
      deals: "Meus Negócios",
      rewards: "Recompensas",
      reports: "Relatórios",
      profile: "Perfil",
      logout: "Sair",
      login: "Entrar",
      register: "Registrar",
      submit: "Enviar",
      cancel: "Cancelar",
      save: "Salvar",
      edit: "Editar",
      delete: "Excluir",
      approve: "Aprovar",
      reject: "Rejeitar",
      loading: "Carregando...",
      error: "Erro",
      success: "Sucesso",
    },
    dashboard: {
      welcome: "Bem-vindo de volta",
      partnerLevel: "Nível de Parceiro",
      totalPoints: "Pontos Totais",
      activeDeals: "Negócios Ativos",
      availablePoints: "Pontos Disponíveis",
      pendingDeals: "Negócios Pendentes",
      redeemedRewards: "Recompensas Resgatadas",
      monthlyEarnings: "Ganhos Mensais",
      recentDeals: "Negócios Recentes",
      quickActions: "Ações Rápidas",
      availableRewards: "Recompensas Disponíveis",
      registerNewDeal: "Registrar Novo Negócio",
      browseRewards: "Navegar Recompensas",
      viewReports: "Ver Relatórios",
    },
    deals: {
      newDeal: "Novo Negócio",
      dealValue: "Valor do Negócio",
      productType: "Tipo de Produto",
      productName: "Nome do Produto",
      quantity: "Quantidade/Licenças",
      closeDate: "Data de Fechamento",
      clientInfo: "Informações do Cliente",
      status: "Status",
      points: "Pontos",
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Rejeitado",
    },
  },
};

export type Language = keyof typeof translations;

let currentLanguage: Language = "en";

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
  localStorage.setItem("preferred-language", lang);
};

export const getLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("preferred-language") as Language;
    if (saved && translations[saved]) {
      currentLanguage = saved;
      return saved;
    }
  }
  return currentLanguage;
};

export const t = (key: string): string => {
  const keys = key.split(".");
  let result: any = translations[currentLanguage];
  
  for (const k of keys) {
    result = result?.[k];
  }
  
  return result || key;
};
