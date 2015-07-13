//TODO
// 1 airdate-dependent coloring and presentation
// 2 partial caught up feature
// 3 calendar
// 4 ability 2 load new data + expand myBools arrays
// 5 prevent adding duplicates

$(function() {
	
	Parse.$ = jQuery; //reassign jQuery, god knows why
	Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

//backbone.js stuff

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
			// console.log(Parse.User.current());
			this.set({
				array: createArray(this.get('seasons'),0)
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
			return model.get('name');
		},
		initialize : function() {
			console.log('ShowStack initialized');
		},
	});

//constants

	var xhr; 					// one xhr request at a time, frien
	var currentTab = ''; 		// which tab we're on
	var defaultTab = 'manage';  // which tab to open on
	var queueLimit = 3; 		// num of eps per show in q item
	var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
	var today = Date.today();
	var longTime 	= 5000; //for toasts
	var shortTime 	= 3000;	//for toasts
	var myBools = new BoolStack;
	var myShows = new ShowStack;

//things to do only once, on startup

	$(document).ready(function() {
		console.log('$(document).ready called');
		tryLogin();
		stateDetermined('manage', 'thinking');
		stateDetermined('queue', 'thinking');
	});

//login stuff

	//returns boolean
	function isLoggedIn() {
		if (Parse.User.current()) {
			return true;
		} else {
			return false;
		}
	}

	//checks if logged in.
	function tryLogin() {
		// console.log(isLoggedIn());

		if(isLoggedIn()) {
			toast('Hi, ' + capitalize(Parse.User.current().attributes.username) + '!');
			displayTabs(true);	bindTabs(true);
			displayWings(true);	bindWings(true);
			bindEmpties(true);
			tab_goto(defaultTab);
			fetchBools();
		} else {
			displayTabs(false);		bindTabs(false);
			displayWings(false);	bindWings(false);
			tab_goto('onboarding');
		}
	}

	//tries to log out.
	function tryLogout() {
		console.log('tryLogout() called');
		if(isLoggedIn()) {
			toast('Bye, ' + capitalize(Parse.User.current().get('username')) + '!');
			Parse.User.logOut();

			displayTabs(false);		bindTabs(false);
			displayWings(false); 	bindWings(false);

			$('#totalQueued').empty();

			tab_goto('onboarding');			
		} else {
			toast('Already logged out.');
		}
	}

//wings stuff

	//does / doesn't display wings
	function displayWings(bool) {
		if(bool) {
	        $('#logio').show();
	        $('#whoami').show();
		    $('#whoami span').html(capitalize(Parse.User.current().get('username')));
		} else {
			$('#logio').hide();
		    $('#whoami').hide();
		    $('#whoami span').empty();
		}
	}

	//does / doesn't bind wings behavior
	function bindWings(bool) {
		if(bool) {
			$('#logio').click(function() {
	        	var oldUsername = Parse.User.current().attributes.username;
	        	tryLogout();
	        });
	        $('#whoami').click(function() {
	        	tab_goto('manage');
	        });
		} else {
			$('#logio').unbind();
			$('#whoami').unbind();
		}
	}

//tab stuff

	//does / doesn't display tabs
	function displayTabs(bool) {
		if(bool) {
			$('.tabsblock a').show();
		} else {
			$('.tabsblock a').hide();
		}
	}

	//does / doesn't bind tab behavior
	function bindTabs(bool) {
		if(bool) {
			$('.tabsblock a').click(function() {
				tab_goto($(this).attr('id'));
			});			
		} else {
			$('.tabsblock a').unbind();
		}
	}

	//navigates to a tab, and changes the .navtabs appearance to match.
	function tab_goto(desiredTab) {
		console.log('tab_goto() ' + desiredTab);

		if (desiredTab == currentTab) {
			return;
		} else {
			$('main section').hide();
			$('section#'+desiredTab).show();
			tab_recolor(desiredTab);
			tab_init(desiredTab);
			currentTab = desiredTab;
			checkStacks();
		}
	}

	//recolors tabs based on which tab was selected
	function tab_recolor(desiredTab) {
		$('.navtabs a').removeClass('btn-large darken-2');
		$('.navtabs a').addClass('btn lighten-1');
		$('.navtabs a#'+desiredTab).toggleClass('btn btn-large darken-2 lighten-1');
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

	function bindEmpties(bool){
		if(bool){
			$('#manage_empty a#follow').click(function(){
				tab_goto('add');
			});
			$('#queue_empty a#follow').click(function(){
				tab_goto('add');
			});
		} else {

		}
	}

// onboarding section behaviors

	//switch onboarding views in dom
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
		        	tryLogin();
		        },

		        error: function(user, error) {
		        	console.log(_.escape(error.message));
		        	onboarding_try_again();
		        }
		      });
		} else if (mode == 'Log In') {
			Parse.User.logIn(username, password, {
		        success: function(user) {
		        	tryLogin();
		        	tab_goto('queue');
		        },
		        error: function(user, error) {
		        	toast("Invalid username or password. Please try again.");
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

// show model behavior

	//given a $showObj OBJ and its status $seen,
	//	look for it on Parse
	//	if it exists, 
	//		fetch its eps
	//	if it doesn't,
	//		create it and fetch its eps 
	function tryShow(showObj, seen) {
		console.log('tryShow() called');

		var query = new Parse.Query(Parse.Object.extend("Show"));
		query.equalTo("show_id", parseInt(showObj.showid));
		query.find({
		  	success: function(results) {
			  	if (results.length != 0){ //if the show exists
			  		var showModel = _.first(results);
		    		fetchEps(showModel, seen); //async
		    		toast("Getting '"+showModel.get('name')+"'...")
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
				    		toast("Getting '"+showModel.get('name')+"'...");
							fetchEps(showModel, seen); //async
						},
						error: function(error) {
							toast("Couldn't add show. Something's quite wrong.");
							toast('Error: ' + error.code + ' ' + error.message);
						}
					});
			  	}
		  	},
		  	error: function(error) {
		  		toast("Couldn't reach Parse. Something's quite wrong.");
		  		toast("Error: " + error.code + ' ' + error.message);
		  	}
		});
	}

	//given a $showModel and a status $seen,
	//	fetch its episodes,
	//	process them,
	// 	and .save() them to the $showModel.
	//	then create a BOOLS of the show.
	function fetchEps(showModel, seen) {
		console.log('fetchEps() called');

		// console.log('getting episodes by model');
		$.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
			dataType: "json",
			type: 'GET',
			success: function(data) {
				showModel.set('episodes', cleanData(data));
				showModel.save();
				tryBools(showModel, seen);
			},
			error: function(error) {
				// console.log(error);
			}
		});
	}

	//given a $showModel and a status $seen,
	//	create a user-specifc BOOLS model and .save() it. 
	function tryBools(showModel, seen) {
		console.log('tryBools() called');

		var query = new Parse.Query(Parse.Object.extend("Bools"));
		//two constraints -- $show_id and $user -- UNSCALEABLE, I think
		query.equalTo("show_id", parseInt(showModel.get('show_id')));
		query.equalTo("user", Parse.User.current());
		
		query.find({
			success: function(results) {
			  	//results.length HAS TO BE ZERO
			  	// if it's not, .destroy() and recreate.

			  	if (results.length != 0){
			  		_.each(results, function(result){
			  			result.destroy();
			  		});
			  	}

				var newBools = new Bools({
					'show_id' : parseInt(showModel.get('show_id')),
					'seasons' : parseInt(showModel.get('num_seasons'))
				});

				var show 	= showModel.get('episodes');
				var array 	= createArray(newBools.get('seasons'),0);

				_.each(show, function(season, season_index){
					_.each(season, function(episode, episode_index){
						array[season_index][episode_index] = seen;
					});
				});

				newBools.set({ 'array' : array });

				newBools.save({
					success: function() {
						var name = showModel.get('name');
						toast('Successfully added ' + name); //toast
						add_great(name); //view
						fetchBools(); //model
					},
					error: function(error) {
						toast("There really shouldn't be an error here. Is Parse down?");
					}
				});

			},
			error: function(error) {
				toast("There really shouldn't be an error here. Is Parse down?");
			}
		});
	}

	// takes a $data OBJ and retuns a nicer $result OBJ
	function cleanData(data) {
		console.log('cleanData() called');

		// console.log(data);
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
	function fetchBools() {

		console.log('fetchBools() called');

		var boolsObject = Parse.Object.extend("Bools");
		var boolsQuery  = new Parse.Query(boolsObject);
		boolsQuery.equalTo("user", Parse.User.current());
		//async
		boolsQuery.find({
			success: function(results) {
				myBools.reset();
				myShows.reset();
				_.each(results, function(result) {
					myBools.add(result);
					fetchShow( result.get('show_id') );
				});
				checkStacks();
			}
		});
	}

	// for a show of $id, finds the SHOW model
	//   and adds it to myShows
	function fetchShow(id) {
		console.log('fetchShow() called');

		var showsObject = Parse.Object.extend("Show");
		var showsQuery  = new Parse.Query(showsObject);
		showsQuery.equalTo("show_id", parseInt(id));
		//async
		showsQuery.find({
			success: function(results) {
				myShows.add( _.first(results) );
				checkStacks();
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
	function checkStacks(){
		console.log('checking stacks');

		var isEqual = (myBools.length == myShows.length);

		stateDetermined('manage', 'thinking');
		stateDetermined('queue', 'thinking');

		update_queued_total();

		//if not equal, not done async loading. otherwise...
		if (!isEqual){ return; } 

		var areShows = (myShows.length != 0);
		var areQueued = (calculate_queued_total() > 0);
		// console.log('isEqual : ' + isEqual + ', areShows : ' + areShows + ', areQueued : ' + areQueued);

		if(areShows){
			stateDetermined('manage', 'thinking');
			stateDetermined('queue', 'thinking');

			manage_render();

			if(areQueued){
				//manage is full, queue is full
				console.log('manage is full, queue is full');
				stateDetermined('manage', 'full');
				stateDetermined('queue', 'full');

				queue_render();
			} else {
				console.log('manage is full, queue is empty');
				stateDetermined('manage', 'full');
				stateDetermined('queue', 'empty');
			}
		} else {
			//manage is empty, queue is empty
			console.log('manage is empty, queue is empty');
			stateDetermined('manage', 'empty');
			stateDetermined('queue', 'empty');
		}
	}

	//given a TAB and its STATE
	//  hide and show all tab states accordingly
	function stateDetermined(tab, state){
		$('#'+tab+'_full').hide();
		$('#'+tab+'_empty').hide();
		$('#'+tab+'_thinking').hide();

		$('#'+tab+'_'+state).show();
	}


// add section behavior

	//cancel the ADD process --> return to $a
	function add_cancel() {
		console.log('add_cancel() called');

		add_switch('a');
		xhr.abort();
		toast("Query aborted.");
	}

	//switch the .card-content to match $stage
	function add_switch(stage) {
		console.log('add_switch() called');

		$('section#add .card-content').hide();
		$('section#add .card-action a').hide();
		$('section#add .card-content#add-content-'+stage).show();
		
		if(stage=='a') {
			$('section#add .card-action a#add').show();
			$('section#add input#input').val("");
			$('section#add input#input').focus();
		} else {
			$('section#add .card-action a#cancel').show();
			$('section#add .card-action a#cancel').click(function() {
				add_cancel();
			});
		}
	}

	//ask what the show is called
	function add_ask() {
		console.log('add_ask() called');

		add_switch('a');
		$("section#add input#input").keyup(function(event) {
			if(event.keyCode == 13) { 
				var title = $('section#add input#input').val();
				add_bring(title);
			}
		});

		$("section#add .card-action a#add").click(function(event) {
			var title = $('section#add input#input').val();
			add_bring(title);
		});
	}

	//bring the search results
	function add_bring(string) {
		console.log('add_bring() called');

		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b b').text(string);
		var shortname = string.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK


		//if the string is empty, it's not a mistake 
		if (!shortname) {
			toast("Type the name of a show you\'d like to follow\ in the input box.");
			$('section#add input#input').focus();
			add_switch('a');
			return;
		}
		// console.log(shortname);
		xhr = $.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=search&query=' + shortname, 
			// url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
			dataType: "json",
			type: 'GET',
			success: function(data) {
				// console.log(data);
				if (data == false) {
					//cancel
					add_switch('a');
					toast('Something\'s wrong with the database.');
				} else if (data[0]=="0") {
					// no search results
					add_switch('a');
					toast('No Search Results Found');
				} else {
					//next step
					add_switch('c');
					add_choose(string, data);
					// console.log(data);
					if(data.show.length) {
						toast(data.show.length + ' Results Found');
					} else {
						toast('1 Result Found');						
					}
				}
			}
		});
	}

	//choose a show from the results
	function add_choose(string, data) {
		console.log('add_choose() called');

		//if there's only one search result, wrap it in an array
		if(!_.isArray(data['show'])) {
			var tempdata = data['show'];
			data['show'] = new Array();
			data['show'].push(tempdata);
		}

	  	var template = _.template( 
	  		$('#search-results-template').html()
  		);

	  	var templateData = { results: data.show };

		$("#add-content-c span").html( template(templateData) );

		$("#add-content-c .collection a").click(function() {
			var id = $(this).attr('id');
			var show_obj = _.findWhere(data.show, {showid: id});
			add_determine(show_obj);
		});
	}

	//determine if you've seen it or not
	function add_determine(show_obj) {
		console.log('add_determine() called');

		add_switch('d');
		$('#add-content-d h5 b').text(show_obj['name']);
		// console.log(show);

		$('div#add-content-d a#full').click(function() {
			tryShow(show_obj, true);
			add_finding(show_obj);
		});
		$('div#add-content-d a#part').click(function() {
			add_exactly(show_obj);
		});
		$('div#add-content-d a#empty').click(function() {
			tryShow(show_obj, false);
			add_finding(show_obj);
		});
	}

	//exactly how far thru the show?
	function add_exactly(show_obj) {
		console.log('add_exactly() called');
	}

	//finding episodes
	function add_finding(show_obj) {
		console.log('add_finding() called');

		add_switch('f');
		$('#add-content-f h5 b').text(show_obj['name']);
	}

	//great, it worked
	function add_great(name) {
		console.log('add_great() called');
		add_switch('g');
		$('#add-content-g h5 b').text(name);
		setTimeout(function() {
			add_switch('a');
		},3000)
	}

// queue stuff

	//renders the queue
	function queue_render() {
		console.log('queue_render() called');

		//check that the rendering is valid
		if (myBools.length != myShows.length) { return; }

  		update_queued_total();

	  	var showTemplate 	= _.template( $('#queue-item-template').html() );
	  	var episode_template = _.template( $('#episode-template').html() );
	  	var moreTemplate 	= _.template( $('#more-template').html() );

		$("section#queue #queue_full").empty(); //empty #queue_full with each render
	  	
	  	//for every show in global myShows
	  	_.each(myShows.models, function(thisShow, show_index){
	  		
		  	var show_id = thisShow.get('show_id');
	  		
	  		if(calculate_queued_per_show(show_id)==0) { return; }	//if all seen, skip entirely

	  		var showTemplateData = {
		        'showname'	: thisShow.get('name'),
		        'unseen'	: calculate_queued_per_show(show_id),
		        'shade'		: 'green',
		        'showid'	: thisShow.get('show_id')
		  	};

			$("section#queue #queue_full").append( showTemplate(showTemplateData) );

			var el = $("section#queue #queue_full li#"+show_id);

			//these are all show-specific
	  		var show = thisShow.get('episodes');
	  		var queuedPerShow = 0;
	  		var isOverflow = false;

		  	//this performs a search so that we don't have to later
		  	//gets the array from global myBools which we're on, according to show_id
			var array = _.first(_.filter(myBools.models, function(model){
				return (model.get('show_id') == show_id);
			})).get('array');

  			//for every season in the show
			_.each(show, function(season, season_index){
	  			//for every episode in the season
	  			_.each(season, function(ep, ep_index){
	  				var seen = array[season_index][ep_index]; //boolean for seen || queued

	  				if(seen){ return; } //if it's queued

  					queuedPerShow++;
  					if (queuedPerShow > queueLimit){
  						isOverflow = true;
  					}
  						  					
  					var episode_templateData = {
  						'show_id' 	: show_id,
				        's' 		: season_index+1,
				        'e' 		: pad(ep_index+1, 2),
				        'j' 		: season_index,
				        'k' 		: ep_index,
				        'title' 	: ep.title,
				        'icon' 		: seen ? 'check_box_outline_blank' : 'check_box',
				        'color' 	: 'green',
				        'extra' 	: isOverflow,
				        'hiding'	: isOverflow ? 'none' : 'inline-block'
  					};

  					//print it
					$("section#queue #queue_full li#"+show_id+" p").append( 
						episode_template(episode_templateData) 
					);
	  			});
			});

			// if there's overflow, write the MORE button
	  		if (isOverflow) {
	  			moreTemplateData = {
	  				'showid'	:	show_id,
	  				'more'		:	String(queuedPerShow - queueLimit) 
	  			};
				el.children('p').append( moreTemplate(moreTemplateData) );
	  		}

	  	});

	  	//update seen + toggle checked on a.episode click
	  	$("section#queue a.episode").click(function() {
	  		var showid  = $(this).attr('data-show');
	  		var season  = $(this).attr('data-season');
	  		var episode = $(this).attr('data-episode');
	  		
	  		toggleSeen(showid, season, episode);
	  		
	  		toggle_el($(this));

	  		update_queued_total();

	  		// $(this).toggleClass('lighten-3');

	  		// if($(this).children('i').html() == 'check_box') {
		  	// 	$(this).children('i').html('check_box_outline_blank');
		  	// 	update_queued_total();
	  		// } else {
		  	// 	$(this).children('i').html('check_box');
		  	// 	update_queued_total();
	  		// }

	  		manage_render();
	  		// checkStacks();
	  	});

	  	//toggle .extra on a.more click
		$("section#queue a.more").click(function() {
			$('#queue_full li#'+$(this).attr('id')+" p a.extra").toggle();

			$(this).children('i').toggleClass('left');
			$(this).children('span.text').toggle();

			//attributes can't be booleans
			if ($(this).attr('data-toggled') == 'false') {
				$(this).children('i').html('expand_less');
				$(this).attr('data-toggled', 'true');
			} else {
				$(this).children('i').html('expand_more');	
				$(this).attr('data-toggled', 'false');
			}

		});
	}

	//updates the total num of qd eps, anywhere needed
	function update_queued_total() {
		console.log('update_queued_total() called');
		
		//currently only needed in the tab span#totalqueued
		var qd = calculate_queued_total();
		if (qd == 0){
			qd = 'Nothing';
		}
		$("span#totalQueued").html(qd);
	}

	//returns the num of queued episodes in global myBools
	function calculate_queued_total() {
		// console.log('calculate_queued_total() called');

		var num = 0;
		_.each(myBools.models, function(model) {
			_.each(model.get('array'), function(s) {
				_.each(s, function(e) {
					if(!e) {num++};
				});
			});
		});
		return num;
	};

	//returns the num of qd eps in a show from global myBools
	function calculate_queued_per_show(showid) {
		// console.log('calculate_queued_per_show() called');

		var num = 0;

		var array = _.first(_.filter(myBools.models, function(i){
			return (i.get('show_id') == showid);
		})).get('array');

		_.each(array, function(s) {
			_.each(s, function(e) {
				if(!e) {num++};
			});
		});

		return num;
	}

// manage stuff

	//renders the MANAGE block
	function manage_render() {
		// console.log(myBools);
		console.log('manage_render() called');

		//check that rendering is valid
		if (myBools.length != myShows.length) { return; }

		//remind user of performance issues
		if (myBools.length > 15) {
			toast('For best performance, remove shows that are off the air.', longTime);
		}

		//define templates
	  	var manage_template				= _.template( $('#manage-item-template').html() );
	  	var manage_details_template		= _.template( $('#manage-details-template').html() );
		var episode_template			= _.template( $('#episode-template').html() );

		//empty #manage_full
		$("section#manage #manage_full").empty();


		//print all elements
		_.each(myShows.models, function(thisShow, index){

		  	var show_id 	= thisShow.get('show_id');
	  		var episodes = thisShow.get('episodes');
	  		var thisBool = _.find(myBools.models, function(item) { return item.get('show_id') === show_id; });
	  		
	  		var manage_data = {
		        'showname'		: thisShow.get('name'),
		        'unseen'		: 0,
		        'shade'			: 'green',
		        'showid'		: thisShow.get('show_id'),
		        'num_seasons'	: thisShow.get('episodes').length
		  	};

			$("section#manage #manage_full").append( manage_template(manage_data) );

			var manage_details_data = {
				name 			: thisShow.get('name'),
				classification	: thisShow.get('classification'),
				country			: thisShow.get('country'),
				started			: thisShow.get('started'),
				ended			: thisShow.get('ended'),
				status			: thisShow.get('status'),
		        episodes 		: thisShow.get('episodes'),
		        num_seasons 	: thisShow.get('episodes').length,
		        showid 			: thisShow.get('show_id')
		  	};

			$("section#manage #manage_full").append( manage_details_template(manage_details_data) );

			_.each(episodes, function(thisSeason, season_index){
				var el = $('section#manage #manage_full #'+show_id+'x'+season_index);

				_.each(thisSeason, function(thisEp, ep_index){

					var seen = thisBool.get('array')[season_index][ep_index];

  					var episode_templateData = {
  						'showid' 	: show_id,
  						'show_id' 	: show_id,
				        's' 		: season_index+1,
				        'e' 		: pad(ep_index+1, 2),
				        'j' 		: season_index,
				        'k' 		: ep_index,
				        'title' 	: thisEp.title,
				        'icon' 		: seen ? 'check_box' : 'check_box_outline_blank',
				        'color' 	: seen ? 'green lighten-2' : 'green',
				        'extra' 	: false,
				        'hiding'	: false
  					};

					el.append( episode_template(episode_templateData) );
				});
			});
		});

		//initialize all tabs
		$('ul.tabs').tabs(); 

		//hide item details
		$('.manage-item-details').hide();
		
		//toggle seen/queued on a.episode click
	  	$("section#manage a.episode").click(function() {
	  		var showid	= $(this).attr('data-show');
	  		var season	= $(this).attr('data-season');
	  		var episode	= $(this).attr('data-episode');
	  		
	  		toggleSeen(showid, season, episode);
	  		
	  		toggle_el($(this));
	  		
	  		queue_render();

	  		update_queued_total();

			update_lenses(myBools);
	  	});

		//expand click behaviors
		var isExpanded = false;

		//expand div on a#expand click	
		$('section#manage a#expand').click(function() {
			$(this).parent().parent().next().toggle();
			if(isExpanded) { 
				$(this).children('i').html('expand_more');
				isExpanded = false;
			} else {
				$(this).children('i').html('expand_less');
				isExpanded = true;				
			}
		});

		//take action on a.click
		$('section#manage .card-action a').click(function() {
			var showid 	= $(this).attr('data-id');
			var name 	= $(this).attr('data-name');
			var action 	= $(this).attr('id');
			if(action=='delete'){
				manage_delete(showid, name);				
			} else if (action=='reset'){
				manage_set_all(showid, name, false);
			} else if (action=='set'){
				manage_set_all(showid, name, true);
			}
			//don't re-render - just toggleSeen for all eps in shw
			//for each .episode

			_.each($('.manage-item-details a.episode'), function(i){
				toggle_el($(i));
			});

			update_lenses(myBools);
		});

		//update lenses at least once per render
		update_lenses(myBools);
	}

	//toggles an episode's element block
	function toggle_el(el){
		el.toggleClass('lighten-3');
	  		
  		if( el.children('i').html()=='check_box' ) {
	  		el.children('i').html('check_box_outline_blank');
  		} else {
	  		el.children('i').html('check_box');
  		}
	}

	//deletes a show
	function manage_delete(showid, name) {
		console.log('manage_delete() called');
		var len = myBools.length;
		boolResult = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

  		showResult = _.first(myShows.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

		toast('Deleted ' + name); //let em know
  		
  		boolResult.destroy(); //destroy bool
  		myShows.remove(showResult); //remove show

		$('#manage_full li#'+showid).remove(); //destroy divs

		checkStacks();			
	}

	//sets all seen / queued for a show
	function manage_set_all(showid, name, allSeen) {
		console.log('manage_set_all() called');

		result = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

  		var tempArray = result.get('array');
  		_.each(tempArray, function(i_item, i_index){
  			_.each(i_item, function(j_item, j_index){
  				tempArray[i_index][j_index] = allSeen;
  			});
  		});

  		if(allSeen){
			toast('Marked all episodes of ' + name + ' as seen.');
  		} else {
			toast('Queued all episodes of ' + name + '.');
  		}
		result.set('array', tempArray);
		result.save();

		update_queued_total();
	}

	// updates ALL the lenses in section#manage
	// TODO rewrite faster: update just a particular show's lenses 
	function update_lenses(myBools) {
		console.log('update_lenses() called');

		myBools.each(function(model, index) {

			var thisBool = model.get('array');
			var show_id = model.get('show_id');

			for(var j = 0; j < thisBool.length; j++) {

				thisSeason = thisBool[j];

				//of the form #12345x0dot, where 12345 is the show_id and 0 is the season index
				var el = $( '#' + show_id + 'x' + j + 'dot'); 

				el.attr('class', 'material-icons'); //removes all classes except one

				if (_.every(thisSeason, _.identity)) { 
					//completely seen season
					el.html('radio_button_unchecked');
					el.addClass('light-green-text');
				} else if (_.some(thisSeason, _.identity)){ 
					//partially seen season
					el.html('timelapse');
					el.addClass('light-green-text');
				} else { 
					//completely unseen season
					el.html('lens');
					el.addClass('green-text');
				}
			}

		});
	}

//general utility functions

	//toggles seen/unseen in the global myBools model
	function toggleSeen(showid, season, episode) {
		console.log('toggleSeen() called');

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
	function toast(str, num) {
		// console.log('toast() called: ' + str);

		if(!_.isUndefined(num)) {
			Materialize.toast(str, num);
		} else {
			Materialize.toast(str, shortTime);			
		}
	}

	//returns an array of multiple dimensions; accepts multiple variables
	function createArray(length) {
		// console.log('createArray() called');

	    var arr = new Array(length || 0),
	        i = length;

	    if (arguments.length > 1) {
	        var args = Array.prototype.slice.call(arguments, 1);
	        while(i--) arr[length-1 - i] = createArray.apply(this, args);
	    }

	    return arr;
	}

	//pads a number $n to width $w with zero character $z
	function pad(n, w, z) {
		z = z || '0';
		n = n + '';
		return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
	}

	//returns a boolean; true if the $date is before global $today
	function hasItAired(date) {
		console.log('hasItAired() called');

		var parsed = Date.parse(date);
		// console.log(parsed);
	}

	//returns a capitalized $string
	function capitalize(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}

});