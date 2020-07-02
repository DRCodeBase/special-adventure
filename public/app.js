/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const app = new Vue({
  el: '#app',
  data: {
    url: '',
    path: '',
    errorMsg: '',
    updatedUrl: null,
  },
  methods: {
    async shortenUrl() {

      // Make request to BE.
      const res = await fetch('/url', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          path: this.path || undefined,
        }),
      });

      // Handle response.
      if (res.ok) {
        await res.json();
        this.updatedUrl = `https://drcodebase.com/${this.path.toLowerCase()}`;
      } else if (res.status === 429) {
        this.errorMsg = 'You have sent to many requests, please try again in 30 seconds.';
      } else {
        const result = await res.json();
        this.errorMsg = result.message;
        this.url = '';
        this.path = '';
      }

    },
  },
});
