$(document).ready(function() {

  $('#usersTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": "/back/users",
    "columnDefs": [
      { "name": "createdAt",   "targets": 0 },
      { "name": "updatedAt",  "targets": 1 },
      { "name": "username", "targets": 2 },
      { "name": "point", "targets": 3 },
      { "name": "email",  "targets": 4 },
      { "name": "lastname", "targets": 5 },
      { "name": "firstname", "targets": 6 },
      { "name": "facebookAccessToken", "targets": 7 }
    ],
    "columns": [
      {
        "data": "createdAt",
        "defaultContent": "Indisponible"
      },
      {
        "data": "updatedAt",
        "defaultContent": "Indisponible"
      },
      {
        sortable: false,
        render: function ( data, type, full, meta ) {
          return '<a href="http://localhost:5000/back/users/' + full._id +'">'+ full.username +'</a>';
        }
      },
      {
        "name": "point",
        "data": "point"
      },
      {
        "data": "email"
      },
      {
        "data": "lastname",
        "defaultContent": "Indisponible"
      },
      {
        "data": "firstname",
        "defaultContent": "Indisponible"
      },
      {
        "data": "facebookAccessToken",
        "defaultContent": "Indisponible"
      }
    ],
  });


  var grillesTable = $('#grillesTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": {
      "url": "/back/users/" + $("#grillesTable").attr("value") + "/grilles",
      "data": function ( d ) {
        d.competition = $('#competitionFilter').val();
      }
    },
    "columns": [
      {
        "data": "createdAt",
        "defaultContent": "Indisponible"
      },
      {
        "data": "updatedAt",
        "defaultContent": "Indisponible"
      },
      { "data": "status" },
      {
        sortable: false,
        render: function ( data, type, full, meta ) {
          return '<a href="http://localhost:5000/back/gametickets/' + full.gameTicket._id +'">'+ full.gameTicket.name +'</a>';
        }
      },
      {
        "data": "numberOfBetsWin",
        "defaultContent": "Indisponible"
      },
      {
        sortable: false,
        "data": "_id"
      },
      {
        sortable: false,
        render: function ( data, type, full, meta ) {
          console.log(full);
          return '<a href="http://localhost:5000/back/grilles/'+ full._id +'" target="_blank">Détails</a>'
          if (full.type === "MULTI"){
            return '<button data-whatever='+meta.row+' class="btn btn-success" role="button" data-toggle="modal" data-target="#grilleMultiModal">Détails</button>';
          } else if (full.type === "SIMPLE"){
            return '<button data-whatever='+meta.row+' class="btn btn-success" role="button" data-toggle="modal" data-target="#grilleSimpleModal">Détails</button>';
          }
          return null;
        }
      }
    ],
  });

  $('#grilleMultiModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var row = button.data('whatever') // Extract info from data-* attributes
    var grille = grillesTable.row(row).data();
    console.log(grille);
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    var modal = $(this)

    modal.find('.modal-title').text('New message to ' + row)
  });

  $('#grilleSimpleModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var row = button.data('whatever') // Extract info from data-* attributes
    var grille = grillesTable.row(row).data();
    var fixture = grille.gameTicket.fixtures[0];
    var events = fixture.events;
    console.log(grille);
    // If necessary, you could initiate an AJAX request here (and then do the updating in a callback).
    // Update the modal's content. We'll use jQuery here, but you could use a data binding library or other methods instead.
    var modal = $(this)

    modal.find(".home-team").text(fixture.homeTeam.name);
    modal.find(".away-team").text(fixture.awayTeam.name);
    modal.find(".score").text(fixture.result.homeScore + " - " + fixture.result.awayScore);


    grille.bets.forEach(function(bet){
      if (bet.type === "1N2"){
        (bet.status === "win") ? modal.find('#bet1').addClass("badge-primary") : modal.find('#bet1').addClass("badge-warning");
        switch(bet.result){
          case 0:
          modal.find('#bet1').text("Match nul");
          break;
          case 1:
          modal.find('#bet1').text(fixture.homeTeam.name);
          break;
          case 2:
          modal.find('#bet1').text(fixture.awayTeam.name);
          break;
        }
      } else if (bet.type === "LESS_MORE_GOAL"){
        (bet.status === "win") ? modal.find('#bet3').addClass("badge-primary") : modal.find('#bet3').addClass("badge-warning");
        switch(bet.result){
          case 0:
          modal.find('#bet3').text("Moins de 2,5");
          break;
          case 1:
          modal.find('#bet3').text("Plus de 2,5");
          break;
        }
      } else if (bet.type === "FIRST_GOAL"){
        (bet.status === "win") ? modal.find('#bet4').addClass("badge-primary") : modal.find('#bet4').addClass("badge-warning");
        switch(bet.result){
          case 0:
          modal.find('#bet4').text("Pas de but marqué");
          break;
          case 1:
          modal.find('#bet4').text(fixture.homeTeam.name);
          break;
          case 2:
          modal.find('#bet4').text(fixture.awayTeam.name);
          break;
        }
      } else if (bet.type === "BOTH_GOAL"){
        (bet.status === "win") ? modal.find('#bet2').addClass("badge-primary") : modal.find('#bet2').addClass("badge-warning");
        switch(bet.result){
          case 0:
          modal.find('#bet2').text("Non");
          break;
          case 1:
          modal.find('#bet2').text("Oui");
          break;
        }
      }
    });

    var eventsTable = modal.find("#eventsTable");
    events.forEach(function(event){
      eventsTable.append('<tr><th scope="row">' + event.team.name +'</th><td>' + event.type + '</td><td>' + event.minute +'</td></tr>');
    });
  });

});
