$(document).ready(function() {

  var competitionsTable = $('#competitionsTable').DataTable({
    "processing": true,
    "serverSide": true,
    "ajax": "/back/competitions",
    "columns": [
      { "data": "_id" },
      { "data": "name" },
      {
        "data": "logo",
        "defaultContent": "Indisponible"
      },
      {
        "data": "season",
        "defaultContent": "Indisponible"
      },
      {
        "data": "api.sportmonks.league",
        "defaultContent": "Indisponible"
      },
      {
        "data": "hashtag",
        "defaultContent": "Indisponible"
      },
      {
        sortable: false,
        "render": function ( data, type, full, meta ) {
          return '<button id='+full._id+' class="btn btn-success edit-competition" role="button" data-toggle="modal" data-target="#editCompetitionModal">Modifier</button>' +
          ' <button id='+full._id+' class="btn btn-success check-score">Check Score</button>';
        }
      }
    ],
  });

  $(document).on( "click", ".edit-competition", function() {
    console.log( $( this ).text() );
    var data = competitionsTable.row($(this).parents().parents('tr')).data();
    console.log(data);
    //console.log($(this).parents().parents('tr'));
    $(".save-competition-form").val($(this).attr("id"));
    $("#inputName").val(data.name);
    $("#inputLogo").val(data.logo);
    $("#inputHashtag").val(data.hashtag);

  });

  $(document).on( "click", ".check-score", function() {
    console.log( $( this ).text() );
    var data = competitionsTable.row($(this).parents().parents('tr')).data();
    console.log(data);
    $.get( "http://localhost:5000/back/fixtures/competition/" + data._id + "/checkScore", function( data ) {
      //$( ".result" ).html( data );
      alert( "Load was performed." );
    });

  });

  $(document).on( "submit", ".save-competition-form", function(e) {
    e.preventDefault();
    var id = $(this).val();
    var name = $("#inputName").val();
    var logo = $("#inputLogo").val();
    var hashtag = $("#inputHashtag").val();
    swal({
      title: "Confirmer la modification",
      text: "Êtes vous sûre de vouloir modifier les informations de la compétition " + id,
      type: "warning",
      showCancelButton: true,
      confirmButtonClass: "btn-danger",
      confirmButtonText: "Oui",
      closeOnConfirm: false
    },
    function(){
      $.ajax({
        method: "PUT",
        url: "/back/competitions",
        data: { id: id, name: name, logo: logo, hashtag: hashtag }
      })
      .done(function( msg ) {
        swal({
          title: "Succès",
          text: "Les informations de la compétitions ont été modifiées.",
          confirmButtonText: "OK"
        }, function(){
          //window.location.reload();
          $("#editCompetitionModal").modal('toggle');
          competitionsTable.ajax.reload( null, false );
        });
      })
      .fail(function() {
        swal("Échec", "Une erreur c'est produite lors de la modification des informations de la compétition.", "error");
      });
    });
  });
});
