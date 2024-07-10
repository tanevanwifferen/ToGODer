<template>
  <v-card title="Dialog">
    <v-card-text>
      <v-text-field v-model="authStore.email" label="Email"></v-text-field>
      <v-text-field
        v-model="authStore.password"
        type="password"
        label="Password"
      ></v-text-field>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn text="Login" @click="authStore.login()"></v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
};
</script>
