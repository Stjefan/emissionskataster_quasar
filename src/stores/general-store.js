import { defineStore } from "pinia";

export const useGeneralStore = defineStore("general", {
  state: () => ({
    projects: [],
    project: null,

    mapInUebersicht: null,
    map2Edit: null,

    emittent2edit: null,

    projectAsTree: null,
    selectedTreenode: null,

    messgeraete: [],

    vorlagenExcelausgabe: [],
  }),
  getters: {},
  actions: {
    foo() {
      console.log(foo);
    },
  },
});
