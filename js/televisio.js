//TODO

//airdate-dependent coloring and presentation
//ability to load in new tvrage data and flexibly expand boolean arrays
//partial caught up feature
//calendar

$(function() {
	
	Parse.$ = jQuery; //reassign jQuery, god knows why
	Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

	var xhr; //one xhr request at a time, friend
	var currentTab = '';
	var defaultTab = 'queue'; //which tab to open on
	var queueLimit = 3;
	var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
	var today = Date.today();
	// console.log(today);
	//onboarding, empty, queue, add, manage

	//things to do only once, on startup
	$(document).ready(function() {
		
		initializeTabs(); //click behavior
		$(".button-collapse").sideNav();
		goToTab(defaultTab); //initial homepage is queue
		checkUser(); //if logged in, get info. if not, present onboarding
	});

//tab stuff

	//jquery behavior for tab drawing
	function initializeTabs(){
		$('.tabsblock a').click(function(){
			goToTab($(this).attr('id'));
		});
	}

	//navigates to a tab, and changes the .navtabs appearance to match.
	function goToTab(str){
		// console.log('was on ' + tab + ' now on ' + str)
		if (str == currentTab) {
			return;
		} else {
			currentTab = str;
			$('main section').hide();
			$('section#'+str).show();
			$('.navtabs a').removeClass('btn-large darken-2');
			$('.navtabs a').addClass('btn lighten-1');
			$('.navtabs a#'+str).toggleClass('btn btn-large darken-2 lighten-1');
			if (str == 'add'){
				add_stage_a();
			} else if (str == 'onboarding'){
				onboarding_init();
			} else if (str == 'empty'){
				empty_init();
			} else if (str == 'queue'){
				queue_init();
			} else if (str == 'manage'){
				manage_init();
			}
		}
	}

// navbar stuff

	function checkUser(){
		if (Parse.User.current()) {
			//we're logged in
			pushAlert('Hi, ' + Parse.User.current().attributes.username + '!');
			//if we're logged in, feed in the bools / shows data
			getMyBools();
	        
	        $('#logio').show();
	        $('#logio').click(function(){
	        	var oldUsername = Parse.User.current().attributes.username;
	        	logMeOut();
	        	pushAlert("Bye, "+oldUsername+"!");
	        });

	        $('#whoami').show();
	        $('#whoami span').text(Parse.User.current().attributes.username);
	        $('ul#dropdown #whoami').click(function(){
	        	goToTab('manage');
	        });    		
		} else {
			//we're logged out
	        $('#logio').hide();
	        $('#whoami').hide();
			goToTab('onboarding');
		}
	}

//login stuff

	function logMeOut(){
		Parse.User.logOut();
		$('#totalQueued').empty();
        $('#logio').hide();
        $('#whoami').hide();
        myBools = new BoolsCollection;
		myShows = new ShowsCollection;
		goToTab('onboarding');
	}

// onboarding section behaviors

	function onboarding_switch(stage){
		$('section#onboarding .card-content').hide();
		$('section#onboarding .card-action a').hide();
		onboarding_try_again();
		if(stage=='a'){
			$('section#onboarding .card-content#about').show();
			$('section#onboarding .card-action a#signup').show();
			$('section#onboarding .card-action a#login').show();			
		} else if (stage == 'b'){
			$('section#onboarding .card-content#entry').show();
			$('section#onboarding .card-action a#cancel').show();
			$('section#onboarding .card-action a#cancel').click(function(){
				onboarding_switch('a');
			});
		}
	}

	function onboarding_init(){
		goToTab('onboarding');
		onboarding_switch('a');
		$('section#onboarding .card-action a').unbind();
		$('section#onboarding .card-action a#login').click(function(){
			onboarding_login();
		});
		$('section#onboarding .card-action a#signup').click(function(){
			onboarding_signup();
		});
	}

	function onboarding_login(){
		$('section#onboarding #entry h5').text('Log In');

		onboarding_switch('b');

		$('section#onboarding .card-action a#go').show();
		$('input#username').focus();

		$("input#password").keyup(function(event){
			if(event.keyCode == 13){ 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#go").click(function(event){
			onboarding_collect();
		});
	}

	function onboarding_signup(){
		$('section#onboarding #entry h5').text('Sign Up');
		onboarding_switch('b');
		$('section#onboarding .card-action a#go').show();
		$('input#username').focus();

		$("input#password").keyup(function(event){
			if(event.keyCode == 13){ 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#go").click(function(event){
			onboarding_collect();
		});
	}

	function onboarding_collect(){
		var username = $('section#onboarding input#username').val();
		var password = $('section#onboarding input#password').val();
		var mode = $('section#onboarding #entry h5').text();
		onboarding_parse(username, password, mode);
	}

	function onboarding_parse(username, password, mode){
		if (mode == 'Sign Up'){
			// console.log('signing up: username:' + username + ' password:'+password);
			Parse.User.signUp(username, password, { ACL: new Parse.ACL(), shows : 0 }, {
		        success: function(user) {
		        	pushAlert('Successfully Signed Up As \'' + username + '\'');
		        	checkUser();
		        	goToTab('queue');
		        },

		        error: function(user, error) {
		        	pushAlert(_.escape(error.message));
		        	onboarding_try_again();
		        }
		      });
		} else if (mode == 'Log In'){
			// console.log('logging in: username:' + username + ' password:'+password);
			Parse.User.logIn(username, password, {
		        success: function(user) {
		        	// console.log('success login');
		        	checkUser();
		        	// ^ this toasts
		        	goToTab('queue');
		        },

		        error: function(user, error) {
		        	pushAlert("Invalid username or password. Please try again.");
		        	onboarding_try_again();
		        }
		     });
		}
	}

	function onboarding_try_again(){
		$('section#onboarding input#username').val('');
		$('section#onboarding input#password').val('');
		$('section#onboarding input#username').focus();
	}


// add section behavior

	function add_cancel(){
		add_switch('a');
		xhr.abort();
		pushAlert("Query aborted.");
	}

	function add_switch(stage){
		$('section#add .card-content').hide();
		$('section#add .card-action a').hide();
		$('section#add .card-content#add-content-'+stage).show();
		if(stage=='a'){
			$('section#add .card-action a#add').show();
			$('section#add input#input').val("");
			$('section#add input#input').focus();
		} else {
			$('section#add .card-action a#cancel').show();
			$('section#add .card-action a#cancel').click(function(){
				add_cancel();
			});
		}
	}

	//what's the name of the show?
	function add_stage_a(){
		add_switch('a');
		$("section#add input#input").keyup(function(event){
			if(event.keyCode == 13){ 
				var title = $('section#add input#input').val();
				add_stage_b(title);
			}
		});

		$("section#add .card-action a#add").click(function(event){
			var title = $('section#add input#input').val();
			add_stage_b(title);
		});
	}

	//searching for shows titled
	function add_stage_b(string){
		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b b').text(string);
		var shortname = string.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK
		// $('section#add .card-content#add-content-b span').text(shortname);
		// console.log(shortname);
		//if the string is empty, it's not a mistake 
		if (!shortname){
			pushAlert("Type the name of a show you\'d like to follow\ in the input box.");
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
			success: function(data){
				console.log(data);
				if (data == false){
					//cancel
					add_switch('a');
					pushAlert('Something\'s wrong with the database.');
				} else if (data[0]=="0"){
					// no search results
					add_switch('a');
					pushAlert('No Search Results Found');
				} else {
					//next step
					add_switch('c');
					add_stage_c(string, data);
					// console.log(data);
					if(data.show.length){
						pushAlert(data.show.length + ' Results Found');
					} else {
						pushAlert('1 Result Found');						
					}
				}
			}
		});
	}

	//which of these do you mean?
	function add_stage_c(string, data){

		console.log('is array? ' + _.isArray(data['show']));

		//if there's only one search result, wrap it in an array
		if(!_.isArray(data['show'])){
			var tempdata = data['show'];
			data['show'] = new Array();
			data['show'].push(tempdata);
		}

	  	var template = _.template( 
	  		$('#search-results-template').html()
  		);

	  	var templateData = { results: data.show };

		$("#add-content-c span").html( template(templateData) );

		$("#add-content-c .collection a").click(function(){
			var id = $(this).attr('id');
			var show = _.findWhere(data.show, {showid: id});
			add_stage_d(show);
		});
	}

	//where are you at?
	function add_stage_d(show){
		add_switch('d');
		$('#add-content-d h5 b').text(show['name']);
		// console.log(show);

		$('div#add-content-d a#full').click(function(){
			addShow(show, true);
			add_stage_f(show);
		});
		$('div#add-content-d a#part').click(function(){
			add_stage_e(show);
		});
		$('div#add-content-d a#empty').click(function(){
			addShow(show, false);
			add_stage_f(show);
		});
	}

	//how far exactly?
	function add_stage_e(show){
	}

	function add_stage_f(show){
		add_switch('f');
		$('#add-content-f h5 b').text(show['name']);
	}
	function add_stage_g(name){
		queue_render();
		add_switch('g');
		$('#add-content-g h5 b').text(name);
		setTimeout(function(){
			add_switch('a');
		},3000)
	}


// empty section behavior

	function empty_init(){
		$('section#empty .card-action a#add').click(function(){
			goToTab('add');
		});
	}

// BOOLS model behavior

	var Bools = Parse.Object.extend("Bools",{
		defaults:{
			'show_id': null,
			'seasons': null,
		    'array': 	null,
		    user:   Parse.User.current()
		    // ACL:    new Parse.ACL(Parse.User.current())
		}, 
		initialize: function(){
			this.set({
				array: createArray(this.get('seasons'),0)
			});
		}
	});

	function tryBools(showModel, seen){

		var query = new Parse.Query(Parse.Object.extend("Bools"));
		
		query.equalTo("show_id", parseInt(showModel.get('show_id')));
		query.equalTo("user", Parse.User.current());
		
		query.find({
		  success: function(results) {
		  	// console.log('Got results from the parse query. Here:');
		  	// console.log(results);

		  	//if the show doesn't exist, make our own

		  	if (results.length == 0){
			    // console.log("Didn't find any boolean results. Creating own.");
				var temp = new Bools({
					'show_id' : parseInt(showModel.get('show_id')),
					'seasons' : parseInt(showModel.get('num_seasons'))
				});


				// console.log('empty is ' + status);
				// console.log('loooking for episodes')
				// console.log(showModel.get('episodes'));

				var eps = showModel.get('episodes');
				var array = createArray(temp.get('seasons'),0);
				for (var i = 0; i < eps.length; i++){
					for (var j = 0; j < eps[i].length; j++){
						// console.log('setting: ' + i + j + seen)
						array[i][j] = seen;
					}
				}

				temp.set({
					'array' : array
				});

				temp.save({
					success: function(){
						var name = showModel.get('name');
						add_stage_g(name);
						pushAlert('Successfully added ' + name);
						getMyBools();
			    		manage_render();
			    		queue_render();
	    		  		update_queued();
					},
					error: function(error){
						// console.log('Didn\'t Save Bools');
						// console.log(error);
						// console.log('error.code ' + error.code + error.message);

					}
				});

		  	} else { //if it does, use it

			    // console.log("Successfully retrieved " + results.length + " bools. Here's the first.");
			    var result = _.first(results);
			    getMyBools();
	    		manage_render();
	    		queue_render();
		  		update_queued();
			    // console.log(result);
		  	}
		  },
		  error: function(error) {
		    // console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}

// show model behavior

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
		initialize: function(){

		},
		ask: function(s, e){

		},
		toggle: function(s, e){

		}
	});

	function addShow(showObj, seen){
		//determine if the show exists or not
		//and create it if it does
		var query = new Parse.Query(Parse.Object.extend("Show"));
		query.equalTo("show_id", parseInt(showObj.showid));
		query.find({
		  success: function(results) {
		  	// console.log('Got results from the parse query. Here they are.');
		  	// console.log(results);
		  	//if the show doesn't exist
		  	if (results.length == 0){
			    // console.log("Didn't find any. Creating own.");
				var showModel = new Show({
					'show_id' : parseInt(showObj.showid),
					'num_seasons' : parseInt(showObj.seasons),
					'name' : String(showObj.name),
					'classification' : String(showObj.classification),
					'country' : String(showObj.country),
					'ended' : String(showObj.ended),
					'started' : String(showObj.started),
					'status' : String(showObj.status)
				});
				showModel.save({
					success: function(){
			    		pushAlert("Getting '"+showModel.get('name')+"'...");
						fetchEps(showModel, seen);
					},
					error: function(error){
						// console.log('Didn\'t Save Show');
						// console.log(error);
						// console.log('error.code ' + error.code + error.message);
					}
				});

		  	} else { //if it does already exist

			    // console.log("Successfully retrieved " + results.length + " scores. Here's the first.");
			    
			    var showModel = _.first(results);
	    		fetchEps(showModel, seen);
			    
			    // console.log(showModel);
	    		
	    		// add_switch('a');
	    		pushAlert("Getting '"+showModel.get('name')+"'...")
		  	}
		  },
		  error: function(error) {
		    // console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}

// episodes handling functions

	function fetchEps(showModel, seen){
		// console.log('getting episodes by model');
		$.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
			dataType: "json",
			type: 'GET',
			success: function(data){
				// console.log(data);
				processedData = processEpisodes(data);

				showModel.set('episodes', processedData);
				showModel.save();

				tryBools(showModel, seen);

			},
			error: function(error){
				// console.log(error);
			}
		});
	}

	function processEpisodes(data){
		console.log(data);
		// console.log('processing episodes');
		var result = [];
		if ( data.totalseasons == 1 ){ //weird case
			result[0] = [];
			for (var i = 0; i < data.Episodelist.Season.episode.length; i++){
				result[0][i] = {};
				result[0][i]['airdate'] = data.Episodelist.Season.episode[i].airdate;
				result[0][i]['epnum'] = data.Episodelist.Season.episode[i].epnum;
				result[0][i]['seasonnum'] = data.Episodelist.Season.episode[i].seasonnum;
				result[0][i]['title'] = data.Episodelist.Season.episode[i].title;
			}
		} else { //normal case
			for (var i = 0; i < data.Episodelist.Season.length; i++){
				result[i] = [];
				for (var j = 0; j < data.Episodelist.Season[i].episode.length; j++){
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

// parse collections

	var BoolsCollection = Parse.Collection.extend({
		model: Bools,
		initialize : function(){
			// console.log('initialize boolsCollection');
		}
	});

	var ShowsCollection = Parse.Collection.extend({
		model: Show,
		comparator: function(model){
			return model.get('name');
		},
		initialize : function(){
			// console.log('initialize showsCollection');
		},
	});

	var myBools = new BoolsCollection;
	var myShows = new ShowsCollection;

//bools fetcher

	function getMyBools(){
		var boolsObject = Parse.Object.extend("Bools");
		var boolsQuery = new Parse.Query(boolsObject);
		boolsQuery.equalTo("user", Parse.User.current());
		boolsQuery.find({
			success: function(results){
				myBools.reset();
				myShows.reset();
				_.each(results, function(result, index){
					myBools.add(result);
					// console.log(index);
					getSingleShow(result.get('show_id'), index);
				});

			}
		});
	}

	function getSingleShow(id, index){
		var showsObject = Parse.Object.extend("Show");
		var showsQuery = new Parse.Query(showsObject);
		// console.log(id);
		showsQuery.equalTo("show_id", parseInt(id));
		showsQuery.find({
			success: function(results){
				var result = _.first(results);
				myShows.add(result);
				// console.log('index' + index);
				if(currentTab == 'queue'){
					queue_render();
				} else if (currentTab == 'manage'){
					manage_render();
				}
			}
		});
	}

// queue stuff

	function queue_init(){
		// console.log('initializing queue');
		queue_render();
	}

	function queue_render(){
		if (myBools.length != myShows.length){ return; }
		// if (myBools.length == 0 || myShows.length == 0){goToTab('empty'); }
		console.log('tests passed, rendering queue afresh');
		
		//these are queue-specific
	  	var showTemplate = _.template( $('#queue-item-template').html() );
	  	var episodeTemplate = _.template( $('#episode-template').html() );

		//empty the queue
		$("section#queue #queuecollection").empty();
	  	
	  	//for every show
	  	for (var i = 0; i < myShows.length; i++){
	  		
	  		var showTemplateData = {
		        showname : myShows.at(i).get('name'),
		        unseen : 0,
		        shade : 'green',
		        showid : myShows.at(i).get('show_id')
		  	};

			$("section#queue #queuecollection").append( 
				showTemplate(showTemplateData) 
			);

			//these are all show-specific
		  	var show_id = myShows.at(i).get('show_id');
	  		var seasons = myShows.at(i).get('episodes');
	  		var queuedCount = 0;
	  		var hidden = false;
	  		var expanded = false;

		  	//this performs a search so that we don't have to later
	  		var thisBool = _.find(myBools.models, function(item){ return item.get('show_id') === show_id; });

	  		//for every season in the show
	  		for (var j = 0; j < seasons.length; j++){
	  			
	  			var season = seasons[j];
	  			
	  			//for every episode in the season
	  			for (var k = 0; k < season.length; k++){
	  				
	  				var ep = season[k];

	  				//find out if the episode has been seen
	  				var seen = thisBool.get('array')[j][k];

	  				//print it only if it's unseen
	  				if (!seen){
	  					queuedCount++;
	  					
	  					if (queuedCount > queueLimit){
	  						hidden = true;
	  					}
	  					
	  					var icon = seen ? 'check_box_outline_blank' : 'check_box';
	  					
	  					var episodeTemplateData = {
	  						'show_id' : show_id,
					        's' : j+1,
					        'e' : pad(k+1, 2),
					        'j' : j,
					        'k' : k,
					        'title' : ep.title,
					        'icon' : icon,
					        'color' : 'green',
					        'extra' : hidden,
					        'hiding': hidden ? 'none' : 'inline-block'
	  					};

						$("section#queue #queuecollection li#"+show_id+" p").append( 
							episodeTemplate(episodeTemplateData) 
						);
	  				}
	  			}
	  		}

	  		//if there IS overflow, this is the code that handles the MORE button
	  		if (queuedCount > queueLimit){

	  			//show the MORE button
	  			$("section#queue #queuecollection li#"+show_id+" p").append( 
					"<a class='btn grey more' id="+show_id+"><i class='material-icons left'>expand_more</i><span class='text'><span class='count'></span> more</span></a>"
				);

				//and figure out what number goes in it
	  			var more = String(queuedCount - queueLimit);
	  			//and add it
	  			$("a.more#"+show_id+" span.count").append(more);

	  			//unbind the behavior
	  			$("a.more").unbind();

	  			//and set MORE click behavior
	  			$("a.more").click(function(){
	  				//probably a cleaner way to do this but damned if it don't work
	  				$('#queuecollection li#'+$(this).attr('id')+" p a.extra").toggle();
	  				if (expanded == false){
		  				$(this).children('i').html('expand_less');
		  				$(this).children('i').toggleClass('left');
		  				$(this).children('span.text').hide();
		  				expanded = true;
	  				} else {
		  				$(this).children('i').html('expand_more');	
		  				$(this).children('i').toggleClass('left');
		  				$(this).children('span.text').show();
		  				expanded = false;
	  				}
	  			});
	  		}


	  		//if all seen, don't even show it in the queue
	  		// console.log(queuedCount);
	  		if(queuedCount==0){
	  			$('#queuecollection li#'+show_id).hide();
	  		}

	  		//write unseen count to span
	  		$("span#unseen"+myShows.at(i).get('show_id')).html(queuedCount);
	  	}

	  	//unbind queue episode buttons - no duplicate behavior
	  	$("section#queue a.episode").unbind();

	  	//toggle on click - model and view
	  	$("section#queue a.episode").click(function(){
	  		var showid = $(this).attr('data_show');
	  		var season = $(this).attr('data_season');
	  		var episode = $(this).attr('data_episode');
	  		
	  		toggleSeen($(this), showid, season, episode);
	  		
	  		$(this).toggleClass('lighten-3');

	  		if($(this).children('i').html()=='check_box'){
		  		$(this).children('i').html('check_box_outline_blank');
		  		update_queued();
	  		} else {
		  		$(this).children('i').html('check_box');
		  		update_queued();
	  		}
	  	});

  		update_queued();
	}

	function update_queued(){
		$("span#totalQueued").html(calculate_queued());
	}

	function calculate_queued(){
		var num = 0;
		_.each(myBools.models, function(obj){
			_.each(obj.get('array'), function(s){
				_.each(s, function(e){
					if(!e){num++};
				});
			});
		});
		return num;
	};

	function calculate_queued_per_show(showid){
		var num = 0;
		_.each(myBools.models, function(obj){
			if(obj.get('show_id')){
				_.each(obj.get('array'), function(s){
					_.each(s, function(e){
						if(!e){num++};
					});
				});
			}
		});
		return num;
	}

// manage stuff

	function manage_init(){
		// console.log('initializing manage');
		// console.log(myShows);
		manage_render();	
	}

	function manage_render(){

		if (myBools.length != myShows.length){ return; }
		if (myBools.length == 0 || myShows.length == 0){ return; }

		// console.log('tests passed, rendering manage afresh');

	  	var manage_template = _.template( $('#manage-item-template').html() );
	  	var manage_details_template = _.template( $('#manage-details-template').html() );
		$("section#manage #managecollection").empty();
		for (var i = 0; i < myShows.length; i++){
			var thisShow = myShows.at(i);
		  	var show_id = thisShow.get('show_id');
	  		var thisBool = _.find(myBools.models, function(item){ return item.get('show_id') === show_id; });
	  		var manage_data = {
		        showname : thisShow.get('name'),
		        unseen : 0,
		        shade : 'green',
		        showid : thisShow.get('show_id'),
		        num_seasons : thisShow.get('episodes').length
		  	};
		  	// console.log('appending showtemplate');
			$("section#manage #managecollection").append( 
				manage_template(manage_data) 
			);
			// console.log(myShows.at(i).get('episodes'));
			var manage_details_data = {
				name : thisShow.get('name'),
				classification	: thisShow.get('classification'),
				country	: thisShow.get('country'),
				started	: thisShow.get('started'),
				ended	: thisShow.get('ended'),
				status	: thisShow.get('status'),
		        episodes : thisShow.get('episodes'),
		        num_seasons : thisShow.get('episodes').length,
		        showid : thisShow.get('show_id')
		  	};
		  	// console.log('appending showtemplate');
			$("section#manage #managecollection").append( 
				manage_details_template(manage_details_data) 
			);
			//inject episodes
			for(var j = 0; j < thisShow.get('episodes').length; j++){
				var seenThisSeason = 0;
				var thisSeason = thisShow.get('episodes')[j];
				for (var k = 0; k < thisSeason.length; k++){
	  				var seen = thisBool.get('array')[j][k];
	  				if(seen){seenThisSeason++;}
					var thisEp = thisSeason[k];
					// console.log(i+' '+j+' '+k);
					// console.log(seen);
					var color = seen?'green lighten-2':'green';
					var icon = seen?'check_box':'check_box_outline_blank';
					// console.log(icon);
					var episodeTemplate = _.template( $('#episode-template').html() );
  					var episodeTemplateData = {
  						'showid' : show_id,
  						'show_id' : show_id,
				        's' : j+1,
				        'e' : pad(k+1, 2),
				        'j' : j,
				        'k' : k,
				        'title' : thisEp.title,
				        'icon' : icon,
				        'color' : color,
				        'extra' : false,
				        'hiding': false
  					};
					$('section#manage #managecollection #'+show_id+'x'+j).append( 
						episodeTemplate(episodeTemplateData) 
					);
				}
			}
		}

		//unbind behaviors
		$("section#manage a.episode").unbind();

		//toggle on click
	  	$("section#manage a.episode").click(function(){
	  		var showid = $(this).attr('data_show');
	  		var season = $(this).attr('data_season');
	  		var episode = $(this).attr('data_episode');
	  		toggleSeen($(this), showid, season, episode);
	  		$(this).toggleClass('lighten-2');
	  		if($(this).children('i').html()=='check_box'){
		  		$(this).children('i').html('check_box_outline_blank');
	  		} else {
		  		$(this).children('i').html('check_box');
	  		}
	  		queue_render();
			update_lenses(myBools);
	  	});
		
		//initialize all tabs
		$('ul.tabs').tabs();
		$('.manage-item-details').hide();
		
		//expand click behaviors
		var expanded = false;
		$('section#manage a#expand').click(function(){
			var showid = $(this).attr('data_id') 
			// console.log(showid);
			$(this).parent().parent().next().toggle();
			if(expanded){ 
				$(this).children('i').html('expand_more');
				expanded = false;
			} else {
				$(this).children('i').html('expand_less');
				expanded = true;				
			}
		});

		$('section#manage a#delete').click(function(){
			var showid = $(this).attr('data_id');
			var name = $(this).attr('data_name');
			manage_delete(showid,name);
		});

		$('section#manage a#reset').click(function(){
			var showid = $(this).attr('data_id');
			var name = $(this).attr('data_name');
			manage_reset(showid,name);
		});

		$('section#manage a#set').click(function(){
			var showid = $(this).attr('data_id');
			var name = $(this).attr('data_name');
			manage_set(showid,name);
		});

		update_lenses(myBools);

	}

	function manage_delete(showid, name){
		var boolsObject = Parse.Object.extend("Bools");
		var boolsQuery = new Parse.Query(boolsObject);
		boolsQuery.equalTo("show_id", parseInt(showid));
		boolsQuery.find({
			success: function(results){
				_.first(results).destroy({
					success: function(){
						pushAlert('Deleted.');
						getMyBools();
						queue_render();
						update_queued();
					}, 
					error: function(){

					}
				});
			}
		});
	}

	function manage_reset(showid, name){
		// console.log(myBools);
		for(var i = 0; i < myBools.length; i++){
			if(myBools.at(i).get('show_id') == showid){
				// console.log(myBools.at(i).get('array'));
				var tempArray = myBools.at(i).get('array');
				for(var j = 0; j < tempArray.length; j++){
					for(var k = 0; k < tempArray[j].length; k++){
						tempArray[j][k] = false;
					}
				}
				myBools.at(i).set('array', tempArray);
				myBools.at(i).save();
				getMyBools();
				queue_render();
				update_queued();
				pushAlert('Queued all episodes of ' + name + '.');
			}
		}
	}

	function manage_set(showid, name){
		console.log(name);
		// console.log(myBools);
		for(var i = 0; i < myBools.length; i++){
			if(myBools.at(i).get('show_id') == showid){
				// console.log(myBools.at(i).get('array'));
				var tempArray = myBools.at(i).get('array');
				for(var j = 0; j < tempArray.length; j++){
					for(var k = 0; k < tempArray[j].length; k++){
						tempArray[j][k] = true;
					}
				}
				myBools.at(i).set('array', tempArray);
				myBools.at(i).save();
				getMyBools();
				queue_render();
				update_queued();
				pushAlert('Marked all episodes of ' + name + ' as seen.');
			}
		}
	}

	function update_lenses(myBools){
		// console.log(myBools.length);
		for(var i = 0; i < myBools.length; i++){
			thisBool = myBools.at(i);
			var show_id = thisBool.get('show_id');
			for(var j = 0; j < thisBool.get('array').length; j++){
				thisSeason = thisBool.get('array')[j];
				// console.log(thisSeason);
				var seenThisSeason = 0;
				for(var k = 0; k < thisSeason.length; k++){
					if(thisSeason[k]){seenThisSeason++;}
				}
				// console.log(seenThisSeason);
				if (seenThisSeason==thisSeason.length){
					//empty season
					$('#'+show_id+'x'+j+'dot').html('radio_button_unchecked');
					$('#'+show_id+'x'+j+'dot').removeClass('green-text light-green-text');
					$('#'+show_id+'x'+j+'dot').addClass('grey-text');
				} else if (seenThisSeason==0){
					//full season
					$('#'+show_id+'x'+j+'dot').html('lens');
					$('#'+show_id+'x'+j+'dot').removeClass('grey-text light-green-text');
					$('#'+show_id+'x'+j+'dot').addClass('green-text');
				} else {
					$('#'+show_id+'x'+j+'dot').html('timelapse');
					$('#'+show_id+'x'+j+'dot').removeClass('grey-text green-text');
					$('#'+show_id+'x'+j+'dot').addClass('light-green-text');
				}
			}
		}

		// if (seenThisSeason==season.length){
		// 	//empty season
		// 	$('#'+show_id+'x'+j+'dot').html('radio_button_unchecked');
		// 	$('#'+show_id+'x'+j+'dot').addClass('grey-text');
		// } else if (seenThisSeason==0){
		// 	//full season
		// 	$('#'+show_id+'x'+j+'dot').html('lens');
		// 	$('#'+show_id+'x'+j+'dot').addClass('green-text');
		// } else {
		// 	$('#'+show_id+'x'+j+'dot').html('timelapse');
		// 	$('#'+show_id+'x'+j+'dot').addClass('light-green-text');
		// }
	}


//general utility functions

	function toggleSeen(element, showid, season, episode){
  		result = _.first(myBools.filter(function(model){
  			return model.get('show_id') == showid;
  		}));
  		arrayCopy = result.get('array')
  		currVal = arrayCopy[season][episode]
  		newVal = !currVal;
  		arrayCopy[season][episode] = newVal
  		result.set('array', arrayCopy);
  		result.save();
  		// console.log(element)
	}


	//pushes an alert to the box in the corner
	function pushAlert(str){
	  Materialize.toast(str, 3000);
	}

	function createArray(length) {
	    var arr = new Array(length || 0),
	        i = length;

	    if (arguments.length > 1) {
	        var args = Array.prototype.slice.call(arguments, 1);
	        while(i--) arr[length-1 - i] = createArray.apply(this, args);
	    }

	    return arr;
	}

	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}

	function hasItAired(date){
		var parsed = Date.parse(date);
		// console.log(parsed);
	}

});