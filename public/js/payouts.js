$(document).ready(function() {

  $('#pendingPayoutsTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": "/back/payouts/dt/pending",
    "columns": [
      { "data": "_id" },
      { "data": "createdAt" },
      { "data": "kind" },
      { "data": "amount" },
      {
        "data": "user.username",
        "defaultContent": "Indisponible"
      },
      { "data": "verified" },
      { "render": function ( data, type, row, meta ) {
        //console.log(row);
        if (row.user){
          return '<div class="btn-group" role="group">\
          <button id="btnGroupDrop1" type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
          Action\
          </button>\
          <div class="dropdown-menu" aria-labelledby="btnGroupDrop1">\
          <a class="dropdown-item" href="#" onclick="verifyUser(\'' + row.user._id +'\')">Vérifier utilisateur</a>\
          <a class="dropdown-item" href="#" onclick="validate(\'' + row._id +'\')">Valider la demande</a>\
          </div>\
          </div>';
        } else {
          return "";
        }
      }}
    ],
  });

});


function getPaymentMessage(id){
  console.log("Get payment message");
  showLoading();
  fetch("http://localhost:5000/back/payouts/" + id + "/payment-message").then(result => {
    return result.json();
  }).then(message => {
    hideLoading();
    swal({ text: message.message });
  }, error => {
    swal("Oh noes!", "The AJAX request failed!", "error");
  });

}

function notifyPayment(id){
  console.log("Notify payment");
  showLoading();
  fetch("http://localhost:5000/back/payouts/notify/payment", {
    method: 'post',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({payoutId: id })
  }).then(result => {
    return result.json();
  }).then(message => {
    hideLoading();
    swal({ text: message });
  }, error => {
    swal("Oh noes!", "The AJAX request failed!", "error");
  });
};


function verifyUser(id){
  console.log("Vérification de la demande de paiement");
  swal({
    text: "Lancer la vérification de la demande de paiement",
    button: {
      text: "Vérifier!",
      closeModal: false,
    }
  }).then(value => {
    if (value){
      return fetch("http://localhost:5000/checker/users/" + id + "/multiaccount");
    } else {
      throw null;
    }
  }).then(result => {
    return result.json();
  }).then(result => {
    console.log(result);
    swal({
      text: "Vérification terminée",
    });
  }).catch(err => {
    if (err) {
      swal("Oh noes!", "The AJAX request failed!", "error");
    } else {
      swal.stopLoading();
      swal.close();
    }
  });
};

function validate(id){
  console.log("Valider la demande de paiement");
  swal({
    text: "Valider la demande de paiement",
    button: {
      text: "Valider!",
      closeModal: false,
    }
  }).then(value => {
    if (value){
      return fetch("http://localhost:5000/back/payouts/" + id + "/validate");
    } else {
      throw null;
    }
  }).then(result => {
    return result.json();
  }).then(result => {
    console.log(result);
    swal({
      text: "Validation terminée",
    });
  }).catch(err => {
    if (err) {
      swal("Oh noes!", "The AJAX request failed!", "error");
    } else {
      swal.stopLoading();
      swal.close();
    }
  });
};
