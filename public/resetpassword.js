$(document).ready(function(){
  function resetError() {
    $('#validation-message').hide();
    $('#validation-message').removeClass("info success warning error");
  }
  function validationMessage(type) {
    resetError();
    $('#validation-message').addClass(type);
    $('#validation-message').slideDown("fast");
    setTimeout(function(){
      $('#validation-message.' + type).slideUp("fast");
    }, 5000);
    setTimeout(function(){
      $('#validation-message.' + type).removeClass(type);
    }, 6000);
  }

  $('#close').click(function() {
    $('#validation-message').slideUp("fast");
  });

  var password = document.getElementById("password");
  var confirm_password = document.getElementById("confirmPassword");
  var formValid = false;

  function validatePassword() {
    if (password.value != confirm_password.value) {
      formValid = false;
      confirm_password.setCustomValidity("Passwords are not the same.");
    } else if (password.value.length < 6){
      formValid = false;
      password.setCustomValidity("The password must contain at least 6 characters and no more than 256.");
    } else {
      confirm_password.setCustomValidity("");
      password.setCustomValidity("");
      formValid = true;
    }
  }
  password.onchange = validatePassword;
  confirm_password.onkeyup = validatePassword;

  $( ".reset-form" ).on('submit',function( event ) {
    event.preventDefault();
    if (!formValid) return;
    $("#submitButton").attr('disabled', 'disabled');
    var url = window.location.pathname;
    var token = url.substring(url.lastIndexOf('/')+1);
    $.ajax({
      url: 'https://api.zanibet.com/api/auth/reset-password/' + token,
      data: { password: $("#password").val() , confirmPassword: $("#confirmPassword").val() },
      type: 'PUT',
      success: function(result) {
        $("#message").text("Your password has been successfully changed! You will be redirected in a few seconds ...");
        validationMessage("success");
        setTimeout(function(){
          window.location = "http://www.zanibet.com";
        }, 5000);
      },
      error: function(request,msg,error) {
        $("#submitButton").removeAttr('disabled');
        $("#message").text(request.responseJSON.message);
        validationMessage("error");
      }
    });
  });
});
