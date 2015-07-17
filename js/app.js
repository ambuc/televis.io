//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// APP

Parse.$ = jQuery; //reassign jQuery, god knows why
Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

var xhr; 					// one xhr request at a time, frien
var currentTab = ''; 		// which tab we're on
var defaultTab = 'queue';  // which tab to open on
var queueLimit = 3; 		// num of eps per show in q item

var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
// var today = Date.today();
var longTime 	= 5000; //for toasts
var shortTime 	= 3000;	//for toasts

var Bools = Parse.Object.extend("Bools",{
	defaults:{
		'show_id'	: 	null,
		'seasons'	: 	null,
	    'array'		: 	null,
	    user		:   Parse.User.current()
	    // ACL:    new Parse.ACL(Parse.User.current())
	}, 
	initialize: function() {
		//on initialization, create an array [[],[],[]] of length $seasons
		this.set({
			array: create_array(this.get('seasons'),0)
		});
	}
});

var Show = Parse.Object.extend("Show",{
	defaults:{
		"classification" : null,
		"country"		 : null,
		"started"		 : null,
		"ended"			 : null,
		"name"			 : null,
		"show_id"		 : null,
		"status"		 : null,
		"num_seasons"    : null,
		"episodes"		 : [],
		"genres"		 : []
	},
	initialize: function() {
	},
	ask: function(s, e) {
	}
});

var BoolStack = Parse.Collection.extend({
	model: Bools,
	initialize : function() {
		console.log('BoolStack initialized');
	}
});

var ShowStack = Parse.Collection.extend({
	model: Show,
	comparator: function(model) {
		// return model.get('name');
		return -calculate_queued(model.get('show_id'));
	},
	initialize : function() {
		console.log('ShowStack initialized');
	},
});

var myBools = new BoolStack;
var myShows = new ShowStack;

var tabStates = {
	'queue'  : 'thinking',
	'manage' : 'thinking'
}
var tabColors = {
	'default' 	: 'white',
	'add' 		: '#4dd0e1',
	'queue' 	: '#00bcd4',
	'manage' 	: '#0097a7',
}

//login stuff


//wings stuff

//does / doesn't display wings
function display_wings(bool) {
	if(bool) {
        $('#logio').show();
        $('#whoami').show();
	    $('#whoami span').html(Parse.User.current().get('username'));
	} else {
		$('#logio').hide();
	    $('#whoami').hide();
	    $('#whoami span').empty();
	}
}

//does / doesn't bind wings behavior
function bind_wings(bool) {
	if(bool) {
		$('#logio').click(function() {
        	var oldUsername = Parse.User.current().attributes.username;
        	try_logout();
        });
        $('#whoami').click(function() {
        	tab_goTo('manage');
        });
	} else {
		$('#logio').unbind();
		$('#whoami').unbind();
	}
}

//tab stuff

//does / doesn't display tabs
function display_tabs(bool) {
	if(bool) {
		$('.tabsblock a').show();
	} else {
		$('.tabsblock a').hide();
	}
}

//does / doesn't bind tab behavior
function bind_tabs(bool) {
	if(bool) {
		$('.tabsblock a').click(function() {
			tab_goTo($(this).attr('id'));
		});			
	} else {
		$('.tabsblock a').unbind();
	}
}

//navigates to a tab, and changes the .navtabs appearance to match.
function tab_goTo(desiredTab) {
	console.log('tab_goTo() ' + desiredTab);

	if (desiredTab == currentTab) {
		return;
	} else {
		$('main section').hide();
		$('section#'+desiredTab).show();
		bg_recolor(desiredTab);
		tab_init(desiredTab);
		currentTab = desiredTab;
		check_stacks(desiredTab);
	}
}

//recolors background to match selected tab
function bg_recolor(desiredTab){
	// $('main').css('background', 'linear-gradient('+tabColors[desiredTab]+', #b2ebf2)');
	$('main').css("background-color", 'white');
	// console.log( $('section#'+desiredTab+" ul.collection") );
	// $('section#'+desiredTab+" ul.collection").css('color', tabColors[desiredTab]);
}

//only necessary for tabs with more than one stage - not queue or manage
function tab_init(desiredTab) {
	if (desiredTab == 'add') {
		add_ask();
		//needs to be reset
	} else if (desiredTab == 'onboarding') {
		onboarding_init();
		//needs to be reset
	}
}

//empties stuff

function bind_empties(bool) {
	if(bool) {
		$('#manage_empty a#follow').click(function() {
			tab_goTo('add');
		});
		$('#queue_empty a#follow').click(function() {
			tab_goTo('add');
		});
	} else {

	}
}

// show model behavior

//given a $showObj OBJ and its status $seen,
//	look for it on Parse
//	if it exists, 
//		fetch its eps
//	if it doesn't,
//		create it and fetch its eps 
function try_show(showObj, seen) {
	console.log('try_show() called');

	var query = new Parse.Query(Parse.Object.extend("Show"));
	query.equalTo("show_id", parseInt(showObj.showid));
	query.find({
	  	success: function(results) {
		  	if (results.length != 0) { //if the show exists
		  		var showModel = _.first(results);
	    		fetch_eps(showModel, seen); //async
	    		make_toast("Getting '"+showModel.get('name')+"'...")
		  	} else {//if the show doesn't
		  		//careful typecasting
				var showModel = new Show({
					'show_id'			: parseInt(showObj.showid),
					'num_seasons'		: parseInt(showObj.seasons),
					'name'				: String(showObj.name),
					'classification'	: String(showObj.classification),
					'country'			: String(showObj.country),
					'ended'				: String(showObj.ended),
					'started'			: String(showObj.started),
					'status'			: String(showObj.status)
				});

				//save showModel to Parse::Show
				showModel.save({
					success: function() {
			    		make_toast("Getting '"+showModel.get('name')+"'...");
						fetch_eps(showModel, seen); //async
					},
					error: function(error) {
						make_toast("Couldn't add show. Something's quite wrong.");
						make_toast('Error: ' + error.code + ' ' + error.message);
					}
				});
		  	}
	  	},
	  	error: function(error) {
	  		make_toast("Couldn't reach Parse. Something's quite wrong.");
	  		make_toast("Error: " + error.code + ' ' + error.message);
	  	}
	});
}

//only called when CREATING a show
//  given a $showModel and a status $seen,
//	  fetch its episodes,
//	  process them,
// 	  and .save() them to the $showModel.
//	then create a BOOLS of the show.
function fetch_eps(showModel, seen) {
	console.log('fetch_eps() called');

	// console.log('getting episodes by model');
	$.ajax({
		url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
		dataType: "json",
		type: 'GET',
		success: function(data) {
			showModel.set('episodes', clean_data(data));
			showModel.save();
			try_bools(showModel, seen);
		},
		error: function(error) {
			// console.log(error);
		}
	});
}

//given a $showModel and a status $seen,
//	create a user-specifc BOOLS model and .save() it. 
function try_bools(showModel, seen) {

	var query = new Parse.Query(Parse.Object.extend("Bools"));
	//two constraints -- $show_id and $user -- UNSCALEABLE, I think
	query.equalTo("show_id", parseInt(showModel.get('show_id')));
	query.equalTo("user", Parse.User.current());
	
	query.find({
		success: function(results) {
		  	//results.length HAS TO BE ZERO
		  	// if it's not, .destroy() and recreate.

		  	if (results.length != 0) {
		  		_.each(results, function(result) {
		  			result.destroy();
		  		});
		  	}

			var newBools = new Bools({
				'show_id' : parseInt(showModel.get('show_id')),
				'seasons' : parseInt(showModel.get('num_seasons'))
			});

			var show 	= showModel.get('episodes');
			var array 	= create_array(newBools.get('seasons'),0);

			_.each(show, function(season, i) {
				_.each(season, function(episode, j) {

					if ( !grok_airdate(episode.airdate) ) {
						array[i][j] = false;							
					} else {
						array[i][j] = seen;
					}

				});
			});

			newBools.set({ 'array' : array });

			newBools.save({
				success: function() {
					var name = showModel.get('name');
					make_toast('Successfully added ' + name); //toast
					add_great(name); //view
					fetch_bools(); //model
				},
				error: function(error) {
					make_toast("There really shouldn't be an error here. Is Parse down?");
				}
			});

		},
		error: function(error) {
			make_toast("There really shouldn't be an error here. Is Parse down?");
		}
	});
}

// takes a $data OBJ and retuns a nicer $result OBJ
function clean_data(data) {
	console.log('clean_data() called');

	console.log(data);
	// console.log('processing episodes');
	var result = [];
	if ( data.totalseasons == 1 ) { //weird case
		result[0] = [];
		for (var i = 0; i < data.Episodelist.Season.episode.length; i++) {
			result[0][i] = {};
			result[0][i]['airdate'] = data.Episodelist.Season.episode[i].airdate;
			result[0][i]['epnum'] = data.Episodelist.Season.episode[i].epnum;
			result[0][i]['seasonnum'] = data.Episodelist.Season.episode[i].seasonnum;
			result[0][i]['title'] = data.Episodelist.Season.episode[i].title;
		}
	} else { //normal case
		for (var i = 0; i < data.Episodelist.Season.length; i++) {
			result[i] = [];
			for (var j = 0; j < data.Episodelist.Season[i].episode.length; j++) {
				result[i][j] = {};
				result[i][j]['airdate'] = data.Episodelist.Season[i].episode[j].airdate;
				result[i][j]['epnum'] = data.Episodelist.Season[i].episode[j].epnum;
				result[i][j]['seasonnum'] = data.Episodelist.Season[i].episode[j].seasonnum;
				result[i][j]['title'] = data.Episodelist.Season[i].episode[j].title;
			}
		}
	}
	return result;
}

//bools fetcher

//resets myBools and myShows
//for the current user, 
//  finds their BOOl models in the database
//  and adds them to myBools
//  and fetches each relevant show
//  and adds them to myShows
function fetch_bools() {

	console.log('fetch_bools() called');

	var boolsQuery  = new Parse.Query( Parse.Object.extend("Bools") );
	boolsQuery.equalTo("user", Parse.User.current());
	//async
	boolsQuery.find({
		success: function(results) {
			myBools.reset();
			myShows.reset();
			_.each(results, function(result) {
				myBools.add( result );
				fetch_show( result.get('show_id') );
			});
			check_stacks(currentTab);
		}
	});
}

// for a show of $id, finds the SHOW model
//   and adds it to myShows
function fetch_show(id) {
	console.log('fetch_show() called');

	var showsQuery  = new Parse.Query( Parse.Object.extend("Show") );
	showsQuery.equalTo("show_id", parseInt(id));
	//async
	showsQuery.find({
		success: function(results) {
			myShows.add( _.first(results) );
			check_stacks(currentTab);
		}
	});
}

// given global myBools and myShows STACKS,
//   updates the queued total
//   determines if the two STACKs are 
//     $isEqual   --> done syncing (equal)
//     $areShows  --> are there shows to MANAGE?
//     $areQueued --> are there eps in the QUEUE?
//   and triggers the tab states accordingly
//   and renders the states accordingly
function check_stacks(desiredTab) {
	// console.log('checking stacks');

	var isEqual = (myBools.length == myShows.length);

	update_queued();

	//if not equal, not done async loading. otherwise...
	if (!isEqual) { 
		fix_state('manage', 'thinking');
		fix_state('queue',  'thinking');
		return; 
	}

	var areShows = (myShows.length != 0);
	var areQueued = (calculate_queued() > 0);
	// console.log('isEqual : ' + isEqual + ', areShows : ' + areShows + ', areQueued : ' + areQueued);

	if(areShows) {
		fix_state('manage', 'thinking');
		fix_state('queue',  'thinking');

		if(desiredTab == 'manage'){
			render_manage();				
		}

		if(areQueued) {
			//manage is full, queue is full
			console.log('manage is full, queue is full');
			fix_state('manage', 'full');
			fix_state('queue',  'full');
			if(desiredTab == 'queue'){
				queue_render();
			}
		} else {
			console.log('manage is full, queue is empty');
			fix_state('manage', 'full');
			fix_state('queue',  'empty');
		}
	} else {
		//manage is empty, queue is empty
		console.log('manage is empty, queue is empty');
		fix_state('manage', 'empty');
		fix_state('queue',  'empty');
	}
}

//given a TAB and its STATE
//  hide and show all tab states accordingly
function fix_state(tab, state) {
	//if already in that state, save the jQuery expense
	if(tabStates[tab]==state){return;}

	console.log('tab ' + tab + ' state ' + state);
	//hide all other tab states
	$('#'+tab+'_full').hide();
	$('#'+tab+'_empty').hide();
	$('#'+tab+'_thinking').hide();
	//and show the relevant one
	$('#'+tab+'_'+state).show();
	//and update the global
	tabStates[tab] = state;
}


//general utility functions


//toggles an episode's element block
function toggle_el(el) {
	el.toggleClass('lighten-2');

	if( el.children('i').html()=='check_box' ) {
		el.children('i').html('check_box_outline_blank');
		el.attr('data-seen', false);
	} else {
		el.children('i').html('check_box');
		el.attr('data-seen', true);
	}
}

//toggles seen/unseen in the global myBools model
function toggle_seen(showid, season, episode) {
	console.log('toggle_seen() called');

		result = _.first(myBools.filter(function(model) {
			return model.get('show_id') == showid;
		}));
		arrayCopy = result.get('array');
		currVal = arrayCopy[season][episode];
		newVal = !currVal;
		arrayCopy[season][episode] = newVal;
		result.set('array', arrayCopy);
		result.save();
}

//pushes an alert to the box in the corner
function make_toast(str, num) {
	// console.log('make_toast() called: ' + str);

	if(!_.isUndefined(num)) {
		Materialize.toast(str, num);
	} else {
		Materialize.toast(str, shortTime);			
	}
}

//returns an array of multiple dimensions; accepts multiple variables
function create_array(length) {
	// console.log('create_array() called');

    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = create_array.apply(this, args);
    }

    return arr;
}

//pads a number $n to width $w with zero character $z
function pad(n, w, z) {
	z = z || '0';
	n = n + '';
	return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

//given a show $id, calculates the index of the season on which to open the tab -- if the first season is entirely seen, start from the second
function calculate_whereFrom(id){
	var array = _.first(_.filter(myBools.models, function(model) {
			return (model.get('show_id') == id);
	})).get('array');

	var initial_display_season = 0;
	var found = false;
	for (var i = 0; i < array.length; i++){
		for (var j = 0; j < array[i].length; j++){
			if (array[i][j] == false && found == false){
				initial_display_season = i;
				found = true;
			}
		}
	}

	if(found == false){
		initial_display_season = array.length-1; //actual length
		found = true;
	}

	return initial_display_season;
}

//given a show $id, calculates the index of the season on which to open the tab -- if the first season is entirely seen, start from the second
function calculate_whichFrom(id){
	var array = _.first(_.filter(myBools.models, function(model) {
			return (model.get('show_id') == id);
	})).get('array');

	var season = 0;
	var episode = 0;
	var found = false;
	for (var i = 0; i < array.length; i++){
		for (var j = 0; j < array[i].length; j++){
			if (array[i][j] == false && found == false){
				season = i;
				episode = j;
				found = true;
			}
		}
	}

	if(found == false){
		initial_display_season = array.length-1; //actual length
		found = true;
	}

	return {
		's' : season,
		'e': episode
	};
}

//returns a boolean; true if the $date is before global $today
function grok_airdate(airdate) {
	return moment(airdate).isBefore();
}

function pick_icon(isSeen, airdate) {
	// console.log(grok_airdate(airdate));
	if (!grok_airdate(airdate)) {
		return 'select_all';
	} else {
		return !isSeen ? 'check_box_outline_blank' : 'check_box';			
	}
}

function pick_color(isSeen, airdate) {
	if (!grok_airdate(airdate)) {
		return 'grey';
	} else {
		return isSeen ? 'green lighten-2' : 'green';
	}
}

//returns a capitalized $string
function capitalize(string) {
    return string.toUpperCase();
}