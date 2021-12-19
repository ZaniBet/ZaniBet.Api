$(document).ready(function() {

  $('#fixturesTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": "/back/fixtures",
    "columns": [
      { "data": "homeTeam.name" },
      { "data": "date" },
      {
        "data": "awayTeam.name",
        "defaultContent": "Indisponible"
      },
      {
        "data": "competition.name",
        "defaultContent": "Indisponible"
      }
    ],
  });

  $("body").on("click", "#fix-score", function(ev){
    var self = $(this);
    var fixtureId = self.val();
    var homeScore = $("#home-score-" + fixtureId).val();
    var awayScore = $("#away-score-" + fixtureId).val();

    console.log("Fixture ID :", fixtureId, "Score :", homeScore, "-", awayScore);

    swal({
      title: "Confirmer la mise à jour du score",
      text: "Merci de confirmer la mise à jour manuelle du score.",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        // Effectuer la requete
        $.ajax({
          method: "PUT",
          url: "/back/fixtures/" + fixtureId + "/score",
          data: { homeScore: homeScore, awayScore: awayScore }
        })
        .done(function( msg ) {
          swal("Youha ! Le score du match a été mis à jour !", {
            icon: "success",
          }).then(() => {
            self.prop('disabled', true);
          });
        })
        .fail(function() {
          swal("Échec", "Une erreur c'est produite lors de la modification des informations de l'équipe.", "error");
        });

      } else {
        swal("Opération annulée");
      }
    });
  });

  $("body").on("click", "#cancel-fixture", function(ev){
    var self = $(this);
    var fixtureId = self.val();
    console.log("Fixture ID :", fixtureId);

    swal({
      title: "Confirmer l'annulation du match",
      text: "Merci de confirmer l'annulation du match",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        // Effectuer la requete
        $.ajax({
          method: "PUT",
          url: "/back/fixtures/" + fixtureId + "/cancel"
        })
        .done(function( msg ) {
          swal("Youha ! Le match a été annulé", {
            icon: "success",
          }).then(() => {
            self.prop('disabled', true);
          });
        })
        .fail(function() {
          swal("Échec", "Une erreur c'est produite lors de l'annulation du match.", "error");
        });

      } else {
        swal("Opération annulée");
      }
    });
  });

});
