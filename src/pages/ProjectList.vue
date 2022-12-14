<template>
  <q-page padding>
    <!-- content -->
    Hello to projects
    <q-btn label="Read" @click="read" />
    <q-btn label="Create" @click="create" />
    <q-btn label="Edit" @click="edit" />
    <q-btn label="Delete" @click="remove" />
  </q-page>
</template>

<script>
export default {
  // name: 'PageName',
  setup() {
    function read() {}

    function create() {}

    function edit(args) {}

    function remove(args) {}

    return {
      read,
      create,
      edit,
      remove,
    };
  },
};
</script>
