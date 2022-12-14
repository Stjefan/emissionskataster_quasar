const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/EditMap.vue") },
      {
        path: "login",
        component: () => import("pages/LoginPage.vue"),
        name: "login",
      },
      {
        path: "projects",
        component: () => import("pages/ProjectList.vue"),
        name: "projectlist",
      },
      {
        path: "project",
        component: () => import("pages/ProjectPage.vue"),
        name: "projectdetails",
      },
      {
        path: "info",
        component: () => import("pages/InfoPage.vue"),
        name: "info",
      },
      {
        path: "messgeraete",
        component: () => import("pages/MessgeraetePage.vue"),
        name: "messgeraete",
      },
      {
        path: "excel",
        component: () => import("pages/ExcelPage.vue"),
        name: "excel",
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
