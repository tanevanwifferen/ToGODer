<template>
  <v-dialog max-width="800" v-model="globalStore.donateViewVisible">
    <template v-slot:default>
      <v-card title="Dialog">
        <v-card-text>
          Has ToGODer been helpful? Consider donating to keep the servers
          running! Please also consider the people who aren't able to donate.
          <v-spacer></v-spacer>
          <v-select
            label="Method"
            v-model="donationMethod"
            :items="globalStore.donateOptions"
            item-title="name"
            item-value="address"
          ></v-select>
          <p v-if="donationMethod != null">
            Please send your donations here: {{ donationMethod }}
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

<script setup>
const globalStore = useGlobalStore();
globalStore.initGlobalStore();
</script>

<script>
export default {
  data() {
    return {
      donationMethod: null,
    };
  },
};
</script>
