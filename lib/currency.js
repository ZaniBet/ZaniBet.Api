var requestify = require('requestify');
exports.convertCurrency = function(dev1, dev2, amount){
  requestify.get('https://finance.google.com/finance/converter?a=' + amount +'&from=' + dev1 +'&to=' + dev2).then(function(response) {
  	// Get the response body
  	var body = response.getBody();
    console.log(body);
  });
};


this.convertCurrency("EUR", "USD", "10");
