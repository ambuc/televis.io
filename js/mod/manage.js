//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO MANAGE TAB FUNCTIONS
                                      
//renders the MANAGE block
function render_manage() {
	// console.log(myBools);
	// console.log('render_manage() called');

	//check that rendering is valid
	if (myBools.length != myShows.length) { return; }

	//remind user of performance issues
	if (myBools.length > 15) {
		make_toast('For best performance, remove shows that are off the air.', longTime);
	}

	//define templates
  	var manage_template = _.template( 
  		$('#manage-item-template').html() 
	);

	//empty #manage_full
	$("section#manage #manage_full").empty();

	//print all elements
	_.each(myShows.models, function(thisShow, index) {

	  	var show_id  = thisShow.get('show_id');
  		var episodes = thisShow.get('episodes');
  		var thisBool = myBools.match(show_id);
  		
  		var manage_data = {
	        'showname'		: thisShow.get('name'),
	        'unseen'		: calculate_queued(show_id),
	        'showid'		: show_id,
	        'num_seasons'	: thisShow.get('episodes').length
	  	};

		$("section#manage #manage_full").append( 
			manage_template(manage_data) 
		);

	});


	//expand div on a#expand click	
	$('section#manage a.expand').click(function() {
		manage_click($(this));
	});

	//update lenses at least once per render
	_.defer(render_lenses);

	if (isEmpty($('section#manage div#settings'))){
		manage_settings_render();
	}
}

//when an a.manage element is clicked, 
//close ALL tabs and open just the necessary one. 
function manage_click(el){
	$("section#manage span.manage-expanded").empty();
	$('section#manage a.expand').children('i').html('expand_more');

	//if it's already open, close it
	if(el.attr('data-open')=='true'){
		//mark all as closed
		$('section#manage a.expand').attr('data-open', 'false');
	} else {
		//mark all as closed
		$('section#manage a.expand').attr('data-open', 'false');
		//mark this as open
		el.attr('data-open', 'true');
		//change the icon
		el.children('i').html('expand_less');

		var id = el.attr('id');
		var cinit = calculate_whereFrom(id);
		//and render the according parts
		render_manage_actions(id);
		render_manage_nav( id, cinit );
		render_manage_season( id, cinit );
	}
}

function manage_settings_render(){
  	var template = _.template( $('#comparators-template').html() );

	$("section#manage div#settings").empty().append( template()  );

	$('section#manage div#settings a.sortby').click(function(){
		$('section#manage div#settings a.sortby').addClass('white grey-text');
		$('section#manage div#settings a.sortby').removeClass('grey white-text');
		$(this).toggleClass('white grey white-text grey-text');
		shows_sort($(this).attr('id'), 'manage');
	});
}


//renders the ACTIONS panel within an expanded MANAGE item
function render_manage_actions(id){
	
	var thisShow = myShows.match(id);

  	var template	= _.template( 
  		$('#manage-actions-template').html() 
	);

	var data = {
		showid 	: 	thisShow.get('show_id'),
		name 	: 	thisShow.get('name'),
	}

	$('span#'+id+'.manage-expanded').append(
		template(data)
	)

	$('.act-row a').unbind()

	//take action on a.click
	$('.act-row a').click(function() {
		var showid	= $(this).attr('data-id');
		var name	= $(this).attr('data-name');
		var action	= $(this).attr('id');
		manage_action(showid, name, action);
	});
}

//renders the NAV panel within an expanded MANAGE item
function render_manage_nav(id, season_index){
	var thisShow = myShows.match(id);

  	var template	= _.template( 
  		$('#manage-nav-template').html() 
		);

		var data = {
			'showid' 	 	: 	id,
			'season_index' 	: 	season_index,
			'season_num'	:  	String(season_index+1), 
			'num_seasons'	: 	thisShow.get('episodes').length
		}

	$('span#'+id+'.manage-expanded').append(
		template(data)
	)

	$('li.nav-row a').unbind();

	$('li.nav-row a#left, li.nav-row a#right').click(function() {
		$('span#'+id+'.manage-expanded').empty();
		render_manage_actions( id );

		var direction = $(this).attr('id');
		var index = $(this).attr('data_index');
		var newIndex = index;

		if ( direction == 'left' ){
			newIndex--;
		} else if ( direction == 'right' ) {
			newIndex++;
		}

		render_manage_nav( id, newIndex );
		render_manage_season( id, newIndex );

		// console.log(direction);
		// console.log(index);
	});
}

//renders the SEASON panel within an expanded MANAGE item
function render_manage_season(id, season_index){

	var thisShow = myShows.match(id);

	var thisBool = myBools.match(id);

	var episodes = thisShow.get('episodes');

	var season_template = _.template( $('#manage-season-template').html() );

	var episode_template = _.template( $('#episode-template').html() );

	var season_el = $('span#'+id+'.manage-expanded');
	
	season_el.append( season_template() );

	var eps_el = $('li.eps-row div div#box');
	// console.log(eps_el);

	// var el = $('section#manage .manage-expanded div.episodes div#'+id+'x'+season_index);
	_.each(episodes[season_index], function(ep, ep_index) {

		var seen = thisBool.get('array')[season_index][ep_index];

			var episode_templateData = {
				'showid' 	: id,
				'show_id' 	: id,
		        's' 		: season_index+1,
		        'e' 		: pad(ep_index+1, 2),
		        'j' 		: season_index,
		        'k' 		: ep_index,
		        'title' 	: ep.title,
		        'icon' 		: pick_icon(seen, ep.airdate),
		        'color' 	: pick_color(seen, ep.airdate),
		        'overflow' 	: false,
		        'airdate' 	: ep.airdate,
		        'hiding'	: false,
		        'disabled'	: !grok_airdate(ep.airdate),
		        'classDisabled' : grok_airdate(ep.airdate)?'':'disabled',
		        'seen' 		: seen
			};

		eps_el.append( episode_template(episode_templateData) );
	});

	//toggle seen/queued on a.episode click
  	$("section#manage a.episode").click(function() {
  		var showid	= $(this).attr('data-show');
  		var season	= $(this).attr('data-season');
  		var episode	= $(this).attr('data-episode');
  		
  		var disabled = $(this).attr('data-disabled');

  		if(disabled=='true') {return;}

  		toggle_seen(showid, season, episode); //toggles the data backend - sends a parse query
  		
  		toggle_el($(this)); //toggles the visual appearance
  		
		update_queued(); //in navbar
		update_queued(showid); //in manage side

		render_lenses(id, season_index); //rerenders lenses - but only the necessary one
  	});
}

//renders lenses in MANAGE item for a particular SEASON and SHOWID
//	if SEASON is undefined, runs on all seasons within a show
//	if SHOWID is undefined, runs on all shows
function render_lenses(showid, season) {
	// console.log('render_lenses('+showid+') called');

	if(myBools.length==0 || myShows.length==0){return;}

	if (_.isUndefined(showid)) {
		_.each(myBools.models, function(model){
			render_lenses(model.get('show_id'));
		});
	} else if (_.isUndefined(season)) {
		var show = myBools.match(showid);
		
		if(_.isUndefined(show)){ return; }
		
		var array = show.get('array');
		
		for(var i in _.range(array.length)){
			render_lenses(showid, i);
		}
	} else {
		var show = myBools.match(showid);
		if(_.isUndefined(show)){ return; }
		var len = show.get('array')[season].length;
		render_lens(showid, season, len);
	}
}

function render_lens(showid, season, len){
	// console.log('render_lens('+showid+') called on season('+season+')');

	for(var i in _.range(len)) {
		
		//of the form #12345x0dot, where 12345 is the showid and 0 is the season index
		var el = $( '#' + showid + 'x' + i + 'dot');

		el.attr('class', 'material-icons'); //removes all classes except one

		if (calculate_queued(showid, i) == 0) { 
			//completely seen season
			el.html('radio_button_unchecked');
			el.addClass('light-green-text');
		} else if (calculate_queued(showid, i) == calculate_viable(showid, i)) { 
			//completely unseen season
			el.html('lens');
			el.addClass('green-text');
		} else {
			//partially seen season
			el.html('timelapse');
			el.addClass('light-green-text');					
		}
	}
}

//deletes a show from MYBOOLS and MYSHOWS
function manage_delete(showid) {
	// console.log('manage_delete() called on showid: ' + showid);

	boolResult = myBools.match(showid);

	showResult = myShows.match(showid);

	make_toast('Deleted ' + showResult.get('name')); //let em know

	boolResult.destroy(); //destroy bool

	myShows.remove(showResult); //remove show

	if(myShows.length==0){
		fix_state('manage', 'empty');
	} else {
		$('section#manage span#'+showid+'.manage-expanded').remove(); //destroy all relevant divs
		$('section#manage li#'+showid+'.manage-item').remove(); //destroy all relevant divs
	}

	update_queued();
}

//performs an action on a show, given the 
function manage_action(showid, name, action){
	var state = (action=='reset')?false:true;

	//MODEL - backend updating works great
	if (action=='delete') {
		manage_delete(showid);				
	} else if (action=='reset') {
		manage_set_all(showid, name, state);
	} else if (action=='set') {
		manage_set_all(showid, name, state);
	}

	update_queued();
	update_queued(showid);
	render_lenses(showid);
}

//sets all seen / queued for a show
function manage_set_all(showid, name, state) {
	// console.log('manage_set_all() called');

	thisBools = myBools.match(showid);

	array = myShows.match(showid).get('episodes');

	var tempArray = thisBools.get('array');

	//sweep the array and mark all episodes as un/seen
	_.each(tempArray, function(i_item, i_index) {
		_.each(i_item, function(j_item, j_index) {
			//if they've aired.
			var hasAired = grok_airdate(array[i_index][j_index].airdate);

			if(!hasAired){
				tempArray[i_index][j_index] = false;
			} else {
				tempArray[i_index][j_index] = state;
			}
		});
	});

	//toast us
	if(state) {
		make_toast('Marked all episodes of ' + name + ' as seen.');
	} else {
		make_toast('Queued all episodes of ' + name + '.');
	}

	//update the array
	thisBools.set('array', tempArray);
	//and save it
	thisBools.save();

	//for all elements,
	_.each($('.manage-expanded li.eps-row a.episode'), function(i) {
		//if it doesn't match the new state, toggle its appearance
		if($(i).attr('data-seen')!=String(state)){
			toggle_el($(i));				
		}
	});
}

