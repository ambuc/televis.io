//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO QUEUE TAB FUNCTIONS

//renders the queue
function queue_render() {
	console.log('queue_render() called');

	//check that the rendering is valid
	if (myBools.length != myShows.length) { return; }

		update_queued();

  	var showTemplate 	= _.template( $('#queue-item-template').html() );
  	var episode_template = _.template( $('#episode-template').html() );
  	var moreTemplate 	= _.template( $('#more-template').html() );

	$("section#queue #queue_full").empty(); //empty #queue_full with each render
  	
  	//for every show in global myShows
  	_.each(myShows.models, function(thisShow, show_index) {
  		
	  	var show_id = thisShow.get('show_id');
  		
  		if(calculate_queued(show_id)==0) { return; }	//if all seen, skip entirely

  		var showTemplateData = {
	        'showname'	: thisShow.get('name'),
	        'unseen'	: calculate_queued(show_id),
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
		var array = _.first(_.filter(myBools.models, function(model) {
			return (model.get('show_id') == show_id);
		})).get('array');

			//for every season in the show
		_.each(show, function(season, season_index) {
  			//for every episode in the season
  			_.each(season, function(ep, ep_index) {
  				var seen = array[season_index][ep_index]; //boolean for seen || queued

  				if(seen) { return; } //if it's queued

  				if(!grok_airdate(ep.airdate)) { return; } //if it's unaired

					queuedPerShow++;
					if (queuedPerShow > queueLimit) {
						isOverflow = true;
					}
						  					
					var episode_templateData = {
						'show_id' 	: show_id,
			        's' 		: season_index+1,
			        'e' 		: pad(ep_index+1, 2),
			        'j' 		: season_index,
			        'k' 		: ep_index,
			        'title' 	: ep.title,
			        'icon' 		: pick_icon(seen, ep.airdate),
			        'color' 	: pick_color(seen, ep.airdate),
			        'overflow' 	: isOverflow,
			        'airdate' 	: ep.airdate,
			        'hiding'	: isOverflow ? 'none' : 'inline-block',
			        'disabled'  : false,
			        'classDisabled' : '',
			        'seen'		: seen
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
  		
  		var disabled = $(this).attr('data-disabled');

  		if(disabled=='true') {return;}

  		toggle_seen(showid, season, episode);
  		
  		toggle_el($(this));

  		update_queued(showid);

  		update_queued();

  	});

  	//toggle .extra on a.more click
	$("section#queue a.more").click(function() {
		$('#queue_full li#'+$(this).attr('id')+" p a.overflow").toggle();

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

	$("section#queue a.watch").click(function(){
		var id = $(this).attr('id');
		var obj = calculate_whichFrom(id);
		var s = obj['s'];
		var e = obj['e'];
		var show = _.first(_.filter(myShows.models, function(model) {
			return (model.get('show_id') == id);
		}));
		var name = show.get('name')
		var ep = show.get('episodes')[s][e];
		// console.log(name);
		// console.log(ep);
		var str = "watch " + name + " online streaming " + ep['title'] + ' S' + String(s+1) + 'E' + pad(e+1, 2)
		var url = "http://www.google.com/search?q=" + str.split(' ').join('+');
		// console.log(url);
		// var url = "";
		window.open(url, '_blank');
	});
}

//generalized function
//  if no $showid supplied, updates all
//  if    $showid supplied, updates just that
function update_queued(showid) {
	if(_.isUndefined(showid)) {
		var qd = calculate_queued();
		if (qd == 0) { qd = 'Nothing'; }
		var el = $("span#totalQueued");
		el.html(qd);
	} else { //if defined, update in queue / manage
		var qd = calculate_queued(showid);
		var q_el = $("section#queue li#"+showid+" span.unseen");
		var m_el = $("section#manage li#"+showid+" span.unseen");
		q_el.html(qd);
		m_el.html(qd);
	}
}

//calculates the viable episodes per season in a show
function calculate_viable(showid, season){
	var num = 0;
	//calculate just for one
	var array = _.first(_.filter(myBools.models, function(i) {
		return (i.get('show_id') == showid);
	})).get('array');

	var eps = _.first(_.filter(myShows.models, function(showModel) {
			return (showModel.get('show_id') == showid);
	})).get('episodes');

	_.each(array[season], function(e, j) {
		var hasAired = grok_airdate(
			eps[season][j].airdate
		);
		if(hasAired) {num++};
	});

	return num;
}

//generalized recursive function
// if $showid exists, calculate just for that
//	else, calculate all qd
function calculate_queued(showid, season) {
	// console.log('calculating queued');

	if (myBools.length != myShows.length) { return; } //skip if not ready

	var num = 0;
	if(_.isUndefined(showid)) {
		//calculate for all
		_.each(myBools.models, function(boolModel) {
			num += calculate_queued(boolModel.get('show_id'));
		});
	} else {
		//calculate just for one
		var show = _.first(_.filter(myBools.models, function(i) {
			return (i.get('show_id') == showid);
		}));
		if(_.isUndefined(show)){
			return;
		}
		var array = show.get('array');

		if(_.isUndefined(season)){
			for(var i in _.range(array.length)){
				num += calculate_queued(showid, i);
			}
		} else {
			var eps = _.first(_.filter(myShows.models, function(showModel) {
				return (showModel.get('show_id') == showid);
			})).get('episodes');

			_.each(array[season], function(e, j) {
				if( !e && grok_airdate( eps[season][j].airdate ) ) {num++};
			});
		}			
	}
	return num;
}
