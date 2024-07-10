<template>
  <div>
    <v-card title="Dialog" v-if="view == 'login'">
      <v-card-text>
        <v-text-field v-model="authStore.email" label="Email"></v-text-field>
        <v-text-field
          v-model="authStore.password"
          type="password"
          label="Password"
        ></v-text-field>
      </v-card-text>

      <v-card-actions>
        <v-btn text="Create User" @click="view = 'createuser'"></v-btn>
        <v-spacer></v-spacer>
        <v-btn text="Login" @click="authStore.login()"></v-btn>
      </v-card-actions>
    </v-card>
    <v-card title="Create User" v-if="view == 'createuser'">
      <v-card-text>
        <v-text-field v-model="authStore.email" label="Email"></v-text-field>
        <v-text-field
          v-model="authStore.password"
          type="password"
          label="Password"
        ></v-text-field>
        <v-text-field
          v-model="passwordCopy"
          type="password"
          label="Repeat Password"
        ></v-text-field>
        <p v-if="verifyText != ''" style="color: red">
          {{ verifyText }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn text="back" @click="view = 'login'">back</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          :disabled="authStore.password != passwordCopy"
          text="Login"
          @click="createUser()"
        ></v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script>
export default {
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  data() {
    return {
      verifyText: '',
      passwordCopy: '',
      view: 'login',
    };
  },
  methods: {
    async createUser() {
      this.verifyText = await this.authStore.createUser();
    },
  },
};
</script>
