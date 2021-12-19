$(document).ready(function() {

  var teamsTable = $('#teamsTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": {
      "url": "/back/teams",
      "data": function ( d ) {
        d.competition = $('#competitionFilter').val();
      }
    },
    "columns": [
      { "data": "name" },
      {
        "data": "shortName",
        "defaultContent": "Indisponible"
      },
      {
        sortable: false,
        "render": function ( data, type, full, meta ) {
          return '<img src="' + full.logo +'" heigth="50" width="50"/>';
        }
      },
      { "data": "competition.name" },
      {
        "data": "hashtag",
        "defaultContent": "Indisponible"
      },
      {
        sortable: false,
        "render": function ( data, type, full, meta ) {
          return '<button id='+full._id+' class="btn btn-success edit-team" role="button" data-toggle="modal" data-target="#editTeamModal">Modifier</button>';
        }
      }
    ],
  });

  var currentTeam = null;

  $("#competitionFilter").on("change", function(){
    console.log("reload table");
    teamsTable.ajax.reload( null, false );
  });

  $(document).on( "click", ".edit-team", function() {
    currentTeam = teamsTable.row($(this).parents().parents('tr')).data();
    console.log(currentTeam);

    $(".save-team-form").val($(this).attr("id"));
    $("#inputName").val(currentTeam.name);
    $("#inputShortName").val(currentTeam.shortName);
    $("#inputLogo").val(currentTeam.logo);
    $("#inputHashtag").val(currentTeam.hashtag);

  });

  $(document).on( "submit", ".save-team-form", function(e) {
    e.preventDefault();
    var id = $(this).val();
    var name = $("#inputName").val();
    var shortName = $("#inputShortName").val();
    var logo = $("#inputLogo").val();
    var hashtag = $("#inputHashtag").val();
    swal({
      title: "Confirmer la modification",
      text: "Êtes vous sûre de vouloir modifier les informations de l'équipe " + currentTeam.name,
      type: "warning",
      showCancelButton: true,
      confirmButtonClass: "btn-danger",
      confirmButtonText: "Oui",
      closeOnConfirm: false
    },
    function(){
      $.ajax({
        method: "PUT",
        url: "/back/teams",
        data: { id: id, name: name, shortName: shortName, logo: logo, hashtag: hashtag  }
      })
      .done(function( msg ) {
        swal({
          title: "Succès",
          text: "Les informations de l'équipe ont été modifiées.",
          confirmButtonText: "OK"
        }, function(){
          //window.location.reload();
          $("#editTeamModal").modal('toggle');
          teamsTable.ajax.reload( null, false );
        });
      })
      .fail(function() {
        swal("Échec", "Une erreur c'est produite lors de la modification des informations de l'équipe.", "error");
      });
    });
  });
});
