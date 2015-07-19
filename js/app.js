// -	FINISH televis.io
// 	-	BUGS
// 		-	EMPTY panel for when there's a new season but no eps in it
// 		-	DUPLICATES when adding a show twice in succession
// 		-	doesn't yet AUTO-UPDATE shows !!!
// 	-	FEATURES
// 		-	SUPPORT larger data sets
// 		-	ADD specific episodes
// 		-	ADD calendar
// 	-	OPTIMIZATIONS
// 		-	CALCULATE_QUEUED should be simple array not _.underscore
// 		-	FETCH_EPS need not trigger for shows in parse database
// 		-	SEMAPHORES for parse calls - easier way to confirm completion

//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// APP

Parse.$ = jQuery; //reassign jQuery, god knows why
Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

var currentTab = ''; 		// which tab we're on
var defaultTab = 'manage';  // which tab to open on
var queueLimit = 3; 		// num of eps per show in q item
var comparatorType = 'date';

var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
// var today = Date.today();
var longTime 	= 5000; //for toasts
var shortTime 	= 3000;	//for toasts

var Bools = Parse.Object.extend("Bools",{
	defaults:{
		'show_id'	: 	null,
		'seasons'	: 	null,
	    'array'		: 	null,
	    'user'		:   Parse.User.current()
	    // ACL:    new Parse.ACL(Parse.User.current())
	}, 
	initialize: function() {
		//on initialization, create an array [[],[],[]] of length $seasons
		this.set({
			'array' : create_array( this.get('seasons') , 0 ),
			'user'  : Parse.User.current()
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
	}
});

var BoolStack = Parse.Collection.extend({
	model: Bools,
	initialize : function() {
		console.log('BoolStack initialized');
	},
	match: function(id){
		return _.first(this.query(id));
	},
	query: function(id){
		return _.filter(this.models, function(model) {
			return (model.get('show_id') == id);
		});
	}
});

var ShowStack = Parse.Collection.extend({
	model: Show,
	comparator: function(model) { 
		// by name
		// return model.get('name');

		// by queued
		// return -calculate_queued(model.get('show_id'));

		// by airdate
		return -calculate_mostRecentAirdate(model.get('show_id'));
	},
	initialize : function() {
		console.log('ShowStack initialized');
	},
	match: function(id){
		return _.first(this.query(id));
	},
	query: function(id){
		return _.filter(this.models, function(model) {
			return (model.get('show_id') == id);
		});
	},
	swapComparator: function(type){
		if (type == 'alpha'){
			this.comparator = function(model) { 
				return model.get('name');
			}
		} else if (type == 'date'){
			this.comparator = function(model) { 
				return -calculate_mostRecentAirdate(model.get('show_id'));
			}
		} else if (type == 'queued'){
			this.comparator = function(model) { 
				return -calculate_queued(model.get('show_id'));
			}
		}
	}
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
		tab_recolor(currentTab, desiredTab);
		tab_init(desiredTab);
		check_stacks(desiredTab);
		currentTab = desiredTab;
	}
}

//recolors background to match selected tab
function bg_recolor(desiredTab){
	// $('main').css('background', 'linear-gradient('+tabColors[desiredTab]+', #b2ebf2)');
	$('main').css("background-color", 'white');
	// console.log( $('section#'+desiredTab+" ul.collection") );
	// $('section#'+desiredTab+" ul.collection").css('color', tabColors[desiredTab]);
}

function tab_recolor(currentTab, desiredTab){
	if(currentTab!=""){
		$('header li #'+currentTab).parent().removeClass('red darken-2');		
	}
	if(desiredTab!=""){
		$('header li #'+desiredTab).parent().addClass('red darken-2');
	}
}

//only necessary for tabs with more than one stage - not queue or manage
function tab_init(desiredTab) {
	if (desiredTab == 'add') {
		add_cancel();
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

		if(desiredTab == 'manage'){
			render_manage();				
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


//toggles an episode's element block
function toggle_el(el) {
	el.toggleClass('lighten-2');
	// el.toggleClass('btn-flat');

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

		result = myBools.match(showid);
		arrayCopy = result.get('array');
		currVal = arrayCopy[season][episode];
		newVal = !currVal;
		arrayCopy[season][episode] = newVal;
		result.set('array', arrayCopy);
		result.save();
}
