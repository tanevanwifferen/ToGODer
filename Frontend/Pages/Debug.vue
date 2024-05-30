<template>
  <div>
    <p>hello {{ message }}</p>
  </div>
</template>

<script>
export default {
  name: "Debug",
  data() {
    return {
      message: "Hello World",
    };
  },
};
</script>
