<template>
  <footer
    style="
      z-index: 10000;
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6em;
      background-color: white;
      border-top: 4px solid black;
    "
    v-if="show"
  >
    <div style="display: flex; justify-content: center; align-items: center">
      <p>
        Please allow analytics. I will not be able to read your conversations.
      </p>
      <v-btn @click="acceptCookies">Accept</v-btn>
      <v-btn @click="declineCookies">Decline</v-btn>
    </div>
  </footer>
</template>

<script>
export default {
  name: "Cookiebanner",
  inheritAttrs: false,
  data() {
    return { show: true };
  },
  created() {
    var c = localStorage.getItem("cookie");
    if (c === "accepted") {
      this.submitPageView();
    }
    if (c === "declined" || c === "accepted") {
      this.show = false;
    }
  },
  methods: {
    submitPageView() {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());

      gtag("config", "G-DHKZB2XVBD");
    },
    acceptCookies() {
      localStorage.setItem("cookie", "accepted");
      this.submitPageView();
      this.show = false;
    },
    declineCookies() {
      localStorage.setItem("cookie", "declined");
      this.show = false;
    },
  },
};
</script>
