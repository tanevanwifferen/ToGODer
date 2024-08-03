<template>
  <v-dialog max-width="800" v-model="globalStore.donateViewVisible" persistent>
    <template v-slot:default>
      <v-card
        title="Please help us out!"
        variant="outlined"
        color="red"
        style="background-color: white"
      >
        <v-card-text>
          Our servers belong to the most expensive in the world. AI costs a lot
          per request, and we want you to have the best models available. Please
          consider donating so we can keep the servers online. Please also keep
          in mind the people who are not able to donate.
          <v-spacer></v-spacer>
          <v-select
            label="Method"
            v-model="donationMethod"
            :items="globalStore.donateOptions"
            item-title="name"
            item-value="address"
          ></v-select>
          <p v-if="donationMethod != null">
            <template v-if="!!donationUrl">
              Please send your donations here:
              <a :href="donationUrl" target="_blank">{{ donationMethod }}</a>
            </template>
            <template v-else>
              Please send your donations here:
              <v-tooltip :text="tooltipText" location="top">
                <template v-slot:activator="{ props }">
                  <span
                    v-bind="props"
                    style="border-bottom: 1px dotted; cursor: pointer"
                    @click="copyToClipboard()"
                  >
                    {{ donationMethod }}
                  </span>
                </template>
              </v-tooltip>
            </template>
          </p>
        </v-card-text>

        <v-card-actions>
          <v-btn
            text="Close Dialog"
            @click="globalStore.donateViewVisible = false"
          ></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script>
const copyText = 'Copy to clipboard';
const copiedText = 'Copied!';
export default {
  setup() {
    const globalStore = useGlobalStore();
    return { globalStore };
  },
  data() {
    return {
      tooltipText: copyText,
      donationMethod: this.globalStore.donateOptions[0]?.address,
    };
  },
  computed: {
    donationUrl() {
      return this.globalStore.donateOptions.find(
        (option) => option.address === this.donationMethod
      )?.url;
    },
  },
  methods: {
    copyToClipboard() {
      navigator.clipboard.writeText(this.donationMethod);
      this.tooltipText = copiedText;
      setTimeout(() => {
        this.tooltipText = copyText;
      }, 1000);
    },
  },
};
</script>
