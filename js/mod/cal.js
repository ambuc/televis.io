function cal_render(){
	// $('section#cal div#settings a').unbind();
	// $('section#cal div#settings a').click( cal_bind );
	// $('section#cal div#settings a#month').click();
	cal_render_month();
}

// var cal_bind = function () {
// 	// console.log('switch');
// 	$('section#cal div#settings a').removeClass('black-text');
// 	$('section#cal div#settings a').addClass('grey-text');
// 	$(this).toggleClass('grey-text black-text');
// 	cal_switch($(this).attr('id'));
// }

function get_upcoming(){
	var upcoming = [];

	_.each(myShows.models, function(model, x){
		var arr = model.get('episodes');
		for(var i = arr.length-1; i>=0; i--){
			for(var j = arr[i].length-1; j>=0; j--){
				if(moment(arr[i][j].airdate).isAfter()){
					arr[i][j].name = model.get('name');
					arr[i][j].season_num = i+1;
					arr[i][j].episode_num = j+1;
					upcoming.push(arr[i][j]);
				} else {
					break;
				}
			}
		}
	});

	return upcoming;
}

function cal_render_month(){

	//sort upcoming by date
	upcoming = _.sortBy(get_upcoming(), function(u){
		return moment(u.airdate);
	});

	//use calendar template
	var calendarTemplate = _.template( $('#calendar-template').html() );
	
	//write template to #canvas
	$('section#cal #canvas').html(calendarTemplate());
	
	//create table with td#num s
	_.each(_.range(4), function(i){
		$('#canvas table tbody').append('<tr></tr>');
		_.each(_.range(7), function(j){
			$('#canvas table tbody tr').eq(i).append('<td id='+parseInt(7*i+j)+'></td>')
		});
	});

	var lastSunday = moment().startOf('week');

	_.each(_.range(28), function(i){
		$('#canvas table tbody td#'+i).append(
			'<span class="tr-head">'+ moment(lastSunday).add(i, 'days').format("MMM D") +'</span>'
		);
	});

	//and write each episode block to the calendar
	_.each(upcoming, function(ep){
		var diff = moment(ep.airdate).diff(
			moment().startOf('week'), 
			'days'
		);
		// console.log(ep);
		$('section#cal #canvas tbody td#'+diff).append( '<span class="cal-item truncate tooltipped" data-position="auto" data-delay-"50" data-tooltip="'+ep.title+'">' + ep.name + '</span>' );
	});

	$('section#cal #canvas tbody td#'+moment().diff(moment().startOf('week'), 'days')+' .tr-head').html('<span class="today">Today</span>');

	$('.tooltipped').tooltip({delay: 50});
}

// function cal_switch(id){
// 	if(id=='dashboard'){
// 		cal_render_dashboard();
// 	} else if (id='month'){
		
// 	}
// }



