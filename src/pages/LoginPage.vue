<template>
  <q-page class="flex flex-center column">
    <div>Login</div>
    <div class="input-group">
      <q-input label="Username" v-model="state.form.body.username" />

      <div class="text-danger text-sm">{{ state.form.errors.username }}</div>
    </div>

    <div class="input-group">
      <q-input
        label="Password"
        type="password"
        v-model="state.form.body.password"
      />

      <div class="text-danger text-sm">{{ state.form.errors.password }}</div>
    </div>
    <br />
    <q-btn label="Login" @click="login" />
    <q-btn label="Further check" @click="furtherCheck" />

    <!-- content -->
  </q-page>
</template>

<script>
import { ref } from "vue";
import { api } from "../boot/axios";
import { useAuth } from "@websanova/vue-auth/src/v3.js";
export default {
  // name: 'PageName',
  setup() {
    const username = ref("");
    const password = ref("");

    const state = ref({
      form: {
        body: {
          username: "sts",
          password: "C5myrq#E32",
        },
        errors: {},
      },
    });

    function errors(res) {
      console.log(res, res.data);
      state.value.form.errors = Object.fromEntries(
        res.data.map((item) => [item.field, item.msg])
      );
    }
    function login() {
      console.log("Login call");
      api
        .post("/api-token-auth/", state.value.form.body)
        .then((res) => {
          console.log(res);
          console.log(api);
          console.log(api.defaults);
          console.log(api.defaults.headers);
          api.defaults.headers.common = {
            Authorization: `Token ${res.data.token}`,
          };
        })
        .catch((e) => errors(e));
    }

    function furtherCheck() {
      console.log("furtherCheck");
      if (false) {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const bodyParameters = {
          key: "value",
        };
      }

      api.get("/example/").then(console.log).catch(console.log);
    }

    return {
      login,
      furtherCheck,
      username,
      password,
      state,
    };
  },
};
</script>
