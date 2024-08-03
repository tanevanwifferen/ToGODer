<template>
  <div>
    <v-card title="Login" v-if="view === 'login'">
      <v-card-text>
        <v-text-field v-model="authStore.email" label="Email"></v-text-field>
        <v-text-field
          v-model="authStore.password"
          type="password"
          label="Password"
        ></v-text-field>
        <p class="fake-a-elt" @click="view = 'forgot_password_send_email'">
          Forgot password
        </p>
      </v-card-text>

      <v-card-actions>
        <v-btn text="Create User" @click="view = 'createUser'"></v-btn>
        <v-spacer></v-spacer>
        <v-btn text="Login" @click="authStore.login()"></v-btn>
      </v-card-actions>
    </v-card>
    <v-card title="Create User" v-if="view === 'createUser'">
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
        <p v-if="verifyText !== ''" style="color: red">
          {{ verifyText }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn text="back" @click="view = 'login'">back</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="verifyText === ''"
          :disabled="authStore.password !== passwordCopy"
          text="Create User"
          @click="createUser()"
        ></v-btn>
        <v-btn
          v-if="verifyText !== ''"
          text="Next"
          @click="view = 'login'"
        ></v-btn>
      </v-card-actions>
    </v-card>
    <v-card
      title="Forgot password"
      v-if="view === 'forgot_password_send_email'"
    >
      <v-card-text>
        <v-text-field v-model="authStore.email" label="Email"></v-text-field>
        <p class="fake-a-elt" @click="view = 'forgot_password_enter_code'">
          Got a code?
        </p>
        <p v-if="verifyText !== ''" style="color: red">
          {{ verifyText }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn text="back" @click="view = 'login'">back</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="verifyText === ''"
          text="Submit"
          @click="sendForgotPasswordEmail()"
        ></v-btn>
        <v-btn
          v-if="verifyText !== ''"
          text="Next"
          @click="view = 'forgot_password_enter_code'"
        ></v-btn>
      </v-card-actions>
    </v-card>
    <v-card
      title="Forgot password"
      v-if="view === 'forgot_password_enter_code'"
    >
      <v-card-text>
        <v-text-field v-model="authStore.email" label="Email"></v-text-field>
        <v-text-field v-model="code" label="Code"></v-text-field>
        <v-text-field
          type="password"
          v-model="authStore.password"
          label="Password"
        ></v-text-field>
        <v-text-field
          type="password"
          v-model="passwordCopy"
          label="Verify Password"
        ></v-text-field>
        <p v-if="verifyText !== ''" style="color: red">
          {{ verifyText }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-btn text="back" @click="view = 'login'">back</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          v-if="verifyText === ''"
          :disabled="authStore.password !== passwordCopy"
          text="Submit"
          @click="setNewPassword()"
        ></v-btn>
        <v-btn
          v-if="verifyText !== ''"
          text="Next"
          @click="view = 'forgot_password_enter_code'"
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
      code: '',
    };
  },
  watch: {
    view() {
      this.verifyText = '';
    },
  },
  methods: {
    async createUser() {
      this.verifyText = await this.authStore.createUser();
    },
    async sendForgotPasswordEmail() {
      this.verifyText = await this.authStore.sendForgotPasswordEmail();
    },
    async setNewPassword() {
      this.verifyText = await this.authStore.setNewPassword(this.code);
    },
  },
};
</script>

<style>
.fake-a-elt {
  color: blue;
  cursor: pointer;
}
</style>
