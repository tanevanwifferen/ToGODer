<template>
  <v-menu
    v-if="globalStore.showLogin"
    v-model="menu"
    :close-on-content-click="false"
    offset-y
    bottom
  >
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props">{{
        authStore.token ? authStore.email : 'Login'
      }}</v-btn>
    </template>
    <login-view style="width: 500px" v-if="view === 'login'"></login-view>
    <v-card v-if="view === 'logout'">
      <!-- TODO: show account info -->
      <v-card-actions>
        <v-tooltip text="Donate on ko-fi to increase" location="bottom">
          <template v-slot:activator="{ props }">
            <p v-bind="props">Balance: ${{ authStore.cost }}</p>
          </template>
        </v-tooltip>
        <v-spacer></v-spacer>
        <v-btn @click="logout()">Logout</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  setup() {
    const authStore = useAuthStore();
    const globalStore = useGlobalStore();
    authStore.initAuthStore();
    return { authStore, globalStore };
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
  computed: {
    view() {
      return this.authStore.token == '' ? 'login' : 'logout';
    },
  },
  methods: {
    logout() {
      this.authStore.logout();
      this.menu = false;
    },
  },
  watch: {
    menu(newval) {
      newval && this.authStore.refreshBilling();
    },
  },
};
</script>
