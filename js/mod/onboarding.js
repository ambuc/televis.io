//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO ONBOARDING FUNCTIONS

//switches onboarding stages
function onboarding_switch(stage) {
	console.log('onboarding_switch() called');

	$('section#onboarding .card-content').hide();
	$('section#onboarding .card-action a').hide();
	onboarding_try_again();
	if(stage=='a') {
		$('section#onboarding .card-content#about').show();
		$('section#onboarding .card-action a#signup').show();
		$('section#onboarding .card-action a#login').show();			
	} else if (stage == 'b') {
		$('section#onboarding .card-content#entry').show();
		$('section#onboarding .card-action a#cancel').show();
		$('section#onboarding .card-action a#cancel').click(function() {
			onboarding_switch('a');
		});
	}
}

//initialize onboarding
function onboarding_init() {
	console.log('onboarding_init() called');

	onboarding_switch('a');
	$('section#onboarding .card-action a').unbind();
	$('section#onboarding .card-action a#login').click(function() {
		onboarding_login();
	});
	$('section#onboarding .card-action a#signup').click(function() {
		onboarding_signup();
	});
}

//if logging in
function onboarding_login() {
	console.log('onboarding_login() called');

	$('section#onboarding #entry h5').text('Log In');

	onboarding_switch('b');

	$('section#onboarding .card-action a#go').show();
	$('input#username').focus();

	$("input#password").keyup(function(event) {
		if(event.keyCode == 13) { 
			onboarding_collect();
		}
	});

	$("section#onboarding .card-action a#go").click(function(event) {
		onboarding_collect();
	});
}

//if signing up
function onboarding_signup() {
	console.log('onboarding_signup() called');

	$('section#onboarding #entry h5').text('Sign Up');
	onboarding_switch('b');
	$('section#onboarding .card-action a#go').show();
	$('input#username').focus();

	$("input#password").keyup(function(event) {
		if(event.keyCode == 13) { 
			onboarding_collect();
		}
	});

	$("section#onboarding .card-action a#go").click(function(event) {
		onboarding_collect();
	});
}

//on GO, collect info and mode and process
function onboarding_collect() {
	console.log('onboarding_collect() called');

	var username 	= $('section#onboarding input#username').val();
	var password 	= $('section#onboarding input#password').val();
	var mode 		= $('section#onboarding #entry h5').text();

	if (mode == 'Sign Up') {
		Parse.User.signUp(username, password, { ACL: new Parse.ACL(), shows : 0 }, {
	        success: function(user) {
	        	try_login();
	        },

	        error: function(user, error) {
	        	make_toast(_.escape(error.message));
	        	console.log(_.escape(error.message));
	        	onboarding_try_again();
	        }
	      });
	} else if (mode == 'Log In') {
		Parse.User.logIn(username, password, {
	        success: function(user) {
	        	try_login();
	        	tab_goTo('queue');
	        },
	        error: function(user, error) {
	        	make_toast("Invalid username or password. Please try again.");
	        	onboarding_try_again();
	        }
		});
	}
}

//if failed, try again
function onboarding_try_again() {
	console.log('onboarding_try_again() called');

	$('section#onboarding input#username').val('');
	$('section#onboarding input#password').val('');
	$('section#onboarding input#username').focus();
}