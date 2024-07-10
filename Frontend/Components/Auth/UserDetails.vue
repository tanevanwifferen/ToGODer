<template>
  <v-menu v-model="menu" :close-on-content-click="false" offset-y bottom>
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props">{{
        authStore.token ? authStore.email : 'Login'
      }}</v-btn>
    </template>
    <login-view style="width: 500px" v-if="authStore.token == ''"></login-view>
    <v-card v-if="authStore.token != ''">
      <!-- TODO: show account info -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="authStore.logout()">Logout</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  setup() {
    const authStore = useAuthStore();
    authStore.initAuthStore();
    return { authStore };
  },
  components: {
    loginView: Vue.defineAsyncComponent(() =>
      load('/Components/Auth/LoginView.vue')
    ),
  },
  data() {
    return {
      menu: false,
    };
  },
};
</script>
