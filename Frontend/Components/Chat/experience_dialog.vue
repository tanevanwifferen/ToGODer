<template>
  <v-dialog max-width="500">
    <template v-slot:activator="{ props: activatorProps }">
      <div
        class="promptsExplanation"
        style="
          display: flex;
          margin-top: 3%;
          align-items: center;
          justify-content: center;
        "
      >
        <v-btn color="green" v-bind="activatorProps"
          >Let ToGODer take the initiative</v-btn
        >
      </div>
    </template>

    <template v-slot:default="{ isActive }">
      <v-card title="Start your ToGODer experience here">
        <v-card-text>
          First time here? Just looking for a chat? Looking to go deeper into
          what's going on in your life? Start your experience here.
          <br />
          Fill in your language to get started.
        </v-card-text>

        <v-card-actions>
          <v-text-field
            v-model="experience_language"
            label="Language"
            :rules="rules"
            hide-details="auto"
          ></v-text-field>

          <v-btn
            text="Start"
            @click="
              isActive.value = false;
              submitForm();
            "
          ></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script>
const experience_language_key = "experience_language";
localStorage.getItem(experience_language_key) ?? localStorage.setItem(experience_language_key, "English"
export default {
    data() {
        return {
            experience_language: localStorage.getItem(experience_language_key),
            rules: [(v) => !!v || 'Language is required'],
        };
    },
    watch{
    experience_language(newVal) {
        localStorage.setItem(experience_language_key, newVal);
    },
},
methods: {
    submitForm() {
        this.$emit('submit', this.experience_language);
    },
},
};
</script>
