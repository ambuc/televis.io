//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO LOGIN/LOGOUT FUNCTIONS

//returns true if logged in
function is_logged_in() {
	if (Parse.User.current()) {
		return true;
	} else {
		return false;
	}
}

//if logged in, starts app; else, onboards
function try_login() {
	// console.log(is_logged_in());

	if(is_logged_in()) {
		make_toast('Hi, ' + Parse.User.current().attributes.username + '!');
		display_tabs(true);	bind_tabs(true);
		display_wings(true);	bind_wings(true);
		bind_empties(true);
		tab_goTo(defaultTab);
		fetch_bools();
	} else {
		display_tabs(false);		bind_tabs(false);
		display_wings(false);	bind_wings(false);
		tab_goTo('onboarding');
	}
}

//if logged in, logs out. else, nothing
function try_logout() {
	// console.log('try_logout() called');
	if(is_logged_in()) {
		make_toast('Bye, ' + Parse.User.current().get('username') + '!');
		Parse.User.logOut();

		display_tabs(false);		bind_tabs(false);
		display_wings(false); 	bind_wings(false);
		bg_recolor('default');
		// $('ul#queue_full').empty();
		// $('#manage_full').empty();

		$('#totalQueued').empty();

		tab_goTo('onboarding');			
	} else {
		make_toast('Already logged out.');
	}
}
