
// a utility to track TV shows
// 
// author: James Buckland
// email: j@mesbuck.land
// github: github.com/ambuc

//                      _              _       
//   ___ ___  _ __  ___| |_ __ _ _ __ | |_ ___ 
//  / __/ _ \| '_ \/ __| __/ _` | '_ \| __/ __|
// | (_| (_) | | | \__ \ || (_| | | | | |_\__ \
//  \___\___/|_| |_|___/\__\__,_|_| |_|\__|___/

var tab; //which tab we're on.
var dashRendered = [];  //which shows have been rendered in the dashboard.
var virtualShows; //local copy of the shows array
var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
var defaultTab = 'queue'; //which tab to open on

function Show () {
  this.type = 'show';

  this.classification = null;
  this.country = null;
  this.ended = null;
  this.lastUpdated = null;
  this.name = null;
  this.showid = null;
  this.started = null;
  this.status = null;

  this.seasons = [];
  this.genres = [];

  this.print = function(str){
    switch(str){
      case 'queue-header' :
        return ''
          +'<span id="' + this.showid + '">'
            + '<a class="orange lighten-1 white-text btn-flat btn-large '
			+ 'show-title" id="' + this.showid + '">'
              + '<i class="mdi-action-label left"> </i>'
              + this.name
            + '</a>'
            + '<br/>'
            + '<span id="epslist">'
            + '</span>'
          +'</span>';
        break;
      case 'edit-button':
        return ""
          + "<a class='waves-effect btn-flat white-text green lighten-2' "
            + "id='"+this.showid+"' "
            + "name='"+this.name+"' "
            + "onclick='deleteShowPrompt("+this.showid+", \""+this.name+"\")' "
            + ">"
            + "<i class='mdi-action-label left'></i>" 
            + this.name
          + "</a>"
            break;
      default:
        return "";
        break;
    }
  }

}

function Season () {
  this.type = 'season';

  this.number = null;
  this.episodes = [];
}

function Episode () {
  this.type = 'episode';

  this.airdate = null;
  this.epnum = null;
  this.link = null;
  this.seen = null;
  this.name = null;

  this.showid = null;
  this.showname = null;

  this.seasonnum_human = null;
  this.seasonnum_computer = null;
  this.episodenum_human = null;
  this.episodenum_computer = null;

  this.print = function(str, i){

    switch(str) {
        case 'specific':
          //determine the color,
          var color = decideColor(this);
          // console.log(color);
          //if the show is unaired
          if (color == 'grey'){
            //skip the [k] iteration and continue.
            return "";
          }
          var isChecked = decideIcon(color);
          //and write a little button block for that episode.
          return '<a class="waves-effect ' + color + ' lighten-1 white-text ' 
			  + 'btn-flat ep" j="' + this.seasonnum_computer + '" '
			  + 'k="' + this.episodenum_computer + '"> '
              + '<i class="' + isChecked + ' left"> </i> '
              + '<b class="left">' 
                + this.seasonnum_human + "x" + this.episodenum_human
              + '</b> &nbsp; ' 
              + this.name 
            + '</a>';
          break;
        case 'queue-episode':
          return ''
            + '<a class="amber lighten-1 white-text btn-flat">'
              + this.seasonnum_human + 'x' + this.episodenum_human
            + '</a>'
            + '<a target="_blank" href = "' + this.assembleLink() + '" '
              + 'class="waves-effect deep-orange lighten-1 ' 
			  + 'white-text lighten-1 btn-flat">'
              + '<i class="mdi-content-link"> </i>'
            + '</a>'
            + '<a class="waves-effect red white-text lighten-1 ' 
			+ 'btn-flat ep eptitle truncate" '
			+ 'i="' + i + '" '
			+ 'j="' + this.seasonnum_computer + '" ' 
			+ 'k="' + this.episodenum_computer + '">'
              + '<i class="mdi-toggle-check-box-outline-blank left"> </i>'
              + this.name
            + '</a>'
            + '<br/>';
          break;
        case 'queue-header':
          return ''
            +'<span id="' + this.showid + '">'
              + '<a class="orange lighten-1 white-text btn-flat btn-large show-title" id="' + this.showid + '">'
                + '<i class="mdi-action-label left"> </i>'
                + this.showname
              + '</a>'
              + '<br/>'
              + '<span id="epslist">'
              + '</span>'
            +'</span>';
          break;
        case 'calendar-button':
          var c = Date.parse(this.airdate);
          var color = decideColor(this);
          var icon = decideIcon(color);
          return ''
            + '<a class="btn-flat waves-effect ' + color + ' white-text ' 
			+ 'lighten-1" data-position="top" data-delay="10" '
            + 'data-tooltip="' + this.seasonnum_human
            + 'x' + this.episodenum_human + ' -- ' + this.name + '" '
            + 'i="' + i + '" '
			+ 'j="' + this.seasonnum_computer + '" '
			+ 'k="' + this.episodenum_computer + '">'
            + '<i class="hide-on-small-only hide-on-med-only '+icon+' left"></i>'
            + '<span class="hide-on-med-only hide-on-large-only">' 
              + abbrev(this.name)
            + '</span>' 
            + '<span class="hide-on-small-only">' 
              + this.showname
            + '</span>' 
            + "</a>";
          break;
        default:
          return "";
    }

  }

  this.assembleLink = function(){
    return "http://www.google.com/search?"
      + "btnI=I&sourceid=navclient&q=" 
      + this.showname.split(' ').join('+') + "+" 
      + this.name.split(' ').join('+') 
      + "+streaming+online+free";
  }
}

//      _             _               
//  ___| |_ __ _ _ __| |_ _   _ _ __  
// / __| __/ _` | '__| __| | | | '_ \ 
// \__ \ || (_| | |  | |_| |_| | |_) |
// |___/\__\__,_|_|   \__|\__,_| .__/ 
//                             |_|    
// functions to call on startup only

//things to do only once, on startup
$(document).ready(function() {
  checkBrowser(); //make sure this browser is OK
  virtualShows = syncStorage(); //sync shows once, from storage, if need be
  virtualShows = reviveShows(virtualShows);
  defineOnce(); //start jquery methods that only need to be called once
  allShowsHaveLastUpdatedValue();
  goToTab(defaultTab); //initial homepage is queue  
});

// takes a shows array and revives every episode in it - intensive but once.
function reviveShows(virtualShows){
  if (!_.isEmpty(virtualShows)){
    for(var i = 0; i < virtualShows.length; i++){
      for(var j = 0; j < virtualShows[i].seasons.length; j++){
        for(var k = 0; k < virtualShows[i].seasons[j].episodes.length; k++){
          virtualShows[i].seasons[j].episodes[k] = reviveEpisode(virtualShows[i].seasons[j].episodes[k]);
        }
      }
      virtualShows[i] = reviveShow(virtualShows[i]);
    }
  }
  return virtualShows;
}

//takes JSONified data and put it back into an Episode class, with methods
function reviveEpisode(ep){
  var newEpisode = new Episode();
  newEpisode.airdate = valiDate(ep.airdate);
  newEpisode.episodenum_computer = ep.episodenum_computer;
  newEpisode.episodenum_human = ep.episodenum_human;
  newEpisode.epnum = ep.epnum;
  newEpisode.link = ep.link;
  newEpisode.name = ep.name;
  newEpisode.seasonnum_computer = ep.seasonnum_computer;
  newEpisode.seasonnum_human = ep.seasonnum_human;
  newEpisode.seen = ep.seen;
  newEpisode.showid = ep.showid;
  newEpisode.showname = ep.showname;
  newEpisode.type = ep.type;
  return newEpisode;
}

//same for shows
function reviveShow(show){
  var newShow = new Show();

  newShow.classification = show.classification;
  newShow.country = show.country;
  newShow.ended = show.ended;
  newShow.lastUpdated = show.lastUpdated;
  newShow.name = show.name;
  newShow.showid = show.showid;
  newShow.started = show.started;
  newShow.status = show.status;
  newShow.seasons = show.seasons
  newShow.genres = show.genres;

  return newShow;
}

//a few behaviors only need to be defined once, because they are never redrawn.
function defineOnce(){

  //the #AddShow panel is hidden and shown, but never redrawn.
  $("#AddShowTitle").keyup(function(event){
    if(event.keyCode == 13){ 
      var title = $('#AddShowTitle').val();
      addShow(title);
    }
  });

  $("#addShow").click(function(event){
    var title = $('#AddShowTitle').val();
    addShow(title);
  });

  //tabs are never redrawn. go to a tab when it is clicked
  $(".navtabs a").click(function(){
    var id = $(this).attr('id');
    goToTab(id);
  });
}

//if a show hasn't ever been updated
//well, now it has
function allShowsHaveLastUpdatedValue(){
  var shows = virtualShows;
  for (var i in shows){
    if (typeof shows[i].lastUpdated == 'undefined'){
      shows[i].lastUpdated = Date.today().toString('d-MMM-yyyy');
    }
  }
}

//              _                          _ 
//  _   _ _ __ (_)_   _____ _ __ ___  __ _| |
// | | | | '_ \| \ \ / / _ \ '__/ __|/ _` | |
// | |_| | | | | |\ V /  __/ |  \__ \ (_| | |
//  \__,_|_| |_|_| \_/ \___|_|  |___/\__,_|_|
// functions which are used across many tabs

//navigates to a tab, and changes the .navtabs appearance to match.
function goToTab(str){
  if (str == tab) {
    return;
  } else {
    tab = str;
    update(str, virtualShows); //update the section we're about to go to
    $('main section').hide();
    $('section#'+str).show();
    $('.navtabs a').removeClass('lighten-1');
    $('.navtabs a').addClass('lighten-3');
    $('.navtabs a#'+str).toggleClass('lighten-1 lighten-3');
    if (str == 'edit'){
      $( "#AddShowTitle" ).focus();
    }
  }
}

//when a show button is clicked, change both its state and appearance
function toggleShow(obj, shows){
  //collect coordinates from html attribute
  var i = obj.attr('i'); // which show
  var j = obj.attr('j'); // which season
  var k = obj.attr('k'); // which ep
  //figure out color
  var currentcolor = decideColor(shows[i].seasons[j].episodes[k]);
  //if it's not aired yet, nothing happens
  if (currentcolor == 'grey'){
    return;
  } else {
    //if it's unseen, mark it seen. if it's seen, mark it unseen
    obj.toggleClass('green red');
    obj.children('i').toggleClass(
      'mdi-toggle-check-box-outline-blank mdi-toggle-check-box'
      );
    shows[i].seasons[j].episodes[k].seen ^= true;
  }
  writeToLocalStorage(shows);
}


//                  _       _       
//  _   _ _ __   __| | __ _| |_ ___ 
// | | | | '_ \ / _` |/ _` | __/ _ \
// | |_| | |_) | (_| | (_| | ||  __/
//  \__,_| .__/ \__,_|\__,_|\__\___|
//       |_|                        
// functions which update one or more tabs

//when a tab is clicked, this function updates
//just that tab, and not the others
function update(str, shows){
  // updates a specific block
  if (str == 'queue') {
    updateQueue(shows)
  } else if (str == 'edit') {
    updateEdit(shows);
  } else if (str == 'calendar') {
    updateCalendar(shows);
  } else if (str == 'dashboard') {
    updateDashboard(shows);
  }
}

//updates the queue tab when called
function updateQueue(shows){

  $(".nothingToWatch").show();
  $(".notYet").show();
  $("#eps").empty().hide();
  var toWatch = false; //is there even anything in the queue to watch??
  var hasTitle; //does a show have a card?

  for (var i in shows){ //for each show

    hasTitle = false;
    //for each season of the show
    for (var j = 0; j < shows[i].seasons.length; j++){ 
      //for each episode of the season
      for (var k = 0; shows[i].seasons[j].episodes.length; k++){ 

        var ep = shows[i].seasons[j].episodes[k];

        //if the ep is not an object, go to the next season
        if (typeof ep !== 'object'){ break; } 
        //if you've seen the ep, go to the next ep
        if (ep.seen == true){ continue; } 

        var compare = Date.today().compareTo(Date.parse(ep.airdate));
        
        //if there is an episode unseen yet aired,
        if (ep.seen==false && compare > 0){ 
          
          var link = ep.assembleLink();

          var isHidden = "";
          if (hasTitle){
            isHidden = "hidden";
          }

          if (hasTitle==false){ //if there isn't yet a card for the show
            if (toWatch==true){ //print a newline if necessary
            }
            hasTitle = true;

            $('#eps').append(
              shows[i].print('queue-header', i)
            );
          }
          toWatch = true; //is there even something to watch?
          $('#eps').show();
          $('#eps #'+shows[i].showid+' #epslist').append(
            ep.print('queue-episode', i)
          );

        }
      }
    }
  }

  // logic for showing and hiding queue hints
  if (toWatch == true){
    $('.notYet').hide();
    $('.nothingToWatch').hide();        
  } else if (shows.length == 0){
    $('.nothingToWatch').hide();
  } else if (shows.length != 0){
    $('.notYet').hide();
  }

  //when a show is clicked in the queue tab, toggle it
  $('#queue a.ep').click(function(){
    toggleShow($(this), shows)
  });

  $('.collapsible').collapsible({
    // changes collapsible behavior to expandable instead of the default
    accordion : false 
  });

  $('.show-title').click(function(){
    goToTab('dashboard');
    // console.log($(this).attr('id'));
    var id = $(this).attr('id');
    $('div#'+id).click();      
  });
}

//updated the Editor when called
function updateEdit(shows){
  // console.log("Running updateEdit");
  $('#listYourShows').empty();

  //create a button for every show
  for (var i in shows){
    $('#listYourShows').append( shows[i].print('edit-button') );
  }

  $('#listYourShows a').hover(function(){
    $(this).toggleClass('green red');
    $(this).children('i').toggleClass('mdi-action-label mdi-content-backspace');
  });
}

//update the calendar tab
function updateCalendar(shows){
  // console.log("Running updateCalendar");
  $('tbody').empty();
  var today = Date.today().toString('MM-dd-yy');
  var diff = dateDiffInDays(Date.today(), Date.parse('last sunday'));
  var counter = diff;
  var inWeekCounter = 0;
  while (counter < (28+diff)){
    if (inWeekCounter == 0){ 
      $('tbody').append('<tr>') 
    }
    if (inWeekCounter == 6){ 
      $('tbody').append('</tr>') 
    }
    var theDateInQuestion = Date.today().addDays(counter).toString('MM-dd-yy');
    $('tbody').append(
      '<td id="'+theDateInQuestion+'"> </td>'
      );
    counter++;
    inWeekCounter++;
    if (inWeekCounter>=7){ inWeekCounter= 0; }
  }

  var thisYear = Date.today().getFullYear();
  for (var i = 0; i < shows.length; i++){
    for (var j = 0; j < shows[i].seasons.length; j++){
      var lastairdate = "";
      for (var k in shows[i].seasons[j].episodes){
        if (!shows[i].seasons[j].episodes[k].seen){
          var ep = shows[i].seasons[j].episodes[k];
          if (ep.airdate == lastairdate){
            continue;
          }
          $('tbody #' + Date.parse(ep.airdate).toString('MM-dd-yy')).append(
            ep.print('calendar-button', i)
          );

          lastairdate = ep.airdate;
        }
      }
    }
  }
  $('tbody #'+today).addClass('today');
  $('tbody a').tooltip({delay: 10});
  $('tbody a').click(function(){
    toggleShow($(this), shows);
  });
}

//updates the Dashboard when called
function updateDashboard(input){

  dashRendered = [];
  for (var i in virtualShows){
    dashRendered.push(false);
  }

  // console.log("Running updateDashboard");
  var shows = input;
  $('.shows').empty();
  $(".shows").append(
    "<ul class='collapsible' id='collapsible' data-collapsible='accordion'>"
    + "</ul>"
    );

  //for each show,...
  for (var i in shows){
    //write the accordion element and its infrastructure, 
    //which contains tabs and their content
    $(".shows .collapsible").append(
      '<li open=false>'
        + '<div class="collapsible-header" i="'+i+'" '
          + 'id="'+shows[i].showid+'">'
          + '<i class="mdi-action-label"></i>'
          + shows[i].name
        + '</div>'
        + '<div class="collapsible-body">'
          + '<div class="row" id="w'+shows[i].showid+'">'
            + '<div class="col s12">'
              + '<ul class="tabs" id="tabs'+shows[i].showid+'">'
              + '</ul>'
            + '</div>'
          + '</div>'
        + '</div>'
      + '</li>'
      );
  }

  $('.collapsible').collapsible({ accordion : false });

  $('#dashboard #collapsible > li .collapsible-header').click(function(){
    openDashRow($(this), virtualShows);
  });
}

//      _           _     _      
//   __| | ___  ___(_) __| | ___ 
//  / _` |/ _ \/ __| |/ _` |/ _ \
// | (_| |  __/ (__| | (_| |  __/
//  \__,_|\___|\___|_|\__,_|\___|
// functions which pick the icon or color of a show

//given a color, picks an icon
function decideIcon(color){
  if (color == 'red'){
    return "mdi-toggle-check-box-outline-blank";
  } else if (color == 'green') {
    return "mdi-toggle-check-box";
  } else if (color == 'grey') {
    return "mdi-content-select-all";
  } else {
    return "mdi-action-extension";
  }
}

//choose a color based on seen data, and airdate
function decideColor(ep){
  var color;
  
  if (typeof ep !== 'object' || $.isEmptyObject(ep)){
    return 'grey';
  }
 
  if ( Date.today().compareTo(Date.parse(ep.airdate)) <= 0 ) {
    color = 'grey'; //unaired
  } else if (ep.seen){
    color = 'green'; //seen
  } else {
    color = 'red'; //unseen
  } 
  return color;
}
                             
//   __ _ _   _  ___ _   _  ___ 
//  / _` | | | |/ _ \ | | |/ _ \
// | (_| | |_| |  __/ |_| |  __/
//  \__, |\__,_|\___|\__,_|\___|
//     |_|                      
// functions specifically useful for rendering the queue



//           _ _ _             
//   ___  __| (_) |_ ___  _ __ 
//  / _ \/ _` | | __/ _ \| '__|
// |  __/ (_| | | || (_) | |   
//  \___|\__,_|_|\__\___/|_|   
// function specifically useful for rendering the editor

//given user input, manages the overall adding of a show
function addShow(title){

  var shows = virtualShows;
  //make a title ready to be queried
  var shortname = title.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK
  
  //if the string is empty, it's not a mistake 
  // - the user doesn't really know what to do
  if (!shortname){
    pushAlert("Type the name of a show you\'d like to follow\
     in the text box :)");
    return;
  }

  //push searching alert
  $('#searchUpdates').show();
  pushSearchUpdate('Searching for shows titled <br/> <b>' + title + "</b>");


  // $.ajax({
  //   url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
  //   dataType: "xml",
  //   type: 'GET',
  //   success: function(data){
  //     console.log(data);
  //     var x2js = new X2JS();
  //     var jsonObj = x2js.xml_str2json( data.responseText );
  //     processJson(jsonObj.html.body.results, shows);
  //   }
  // });

  $.ajax({
    url: 'http://www.jbuckland.com/ketchup.php?func=search&query=' + shortname, 
    // url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
    dataType: "json",
    type: 'GET',
    success: function(data){
      // console.log(data);
      processJson(data, shows);
    }
  });
}

//json is the first level of data
//the response to the search query
function processJson(json, shows){
  //check if we even got anything
  if (!json.show){
    //if we didn't, tell me and cancel the whole operation
    pushAlert("We can't find the show you're looking for :(");
      $('#AddShowTitle').val('');
      $('#searchUpdates').hide();
      return;
    }

  //if we did get something, get the first search result
  if($.isArray(json.show)) {
    json.show = json.show[0];
  }

  //check if show we found is already in our array of shows
  for (var i = 0; i < shows.length; i++){
    if (shows[i].showid == json.show.showid){
      // if it is, tell me and cancel the whole operation
      pushAlert("You're aleady watching that show!");
      $('#searchUpdates').hide();
      $('#AddShowTitle').val('');
      return;
    }
  }

  //this exists to cover a rare but awful bug.
  //basically a show needs to be started or not. 
  //but some entries don't have a value at all. now they all do.
  var started;
  if (typeof json.show.started != 'undefined'){
    started = json.show.started;
  } else {
    started = "";
    json.show.started = started;
  }

  //tell the user we found a show and are getting episodes
  pushSearchUpdate("Getting episodes of <br/> <b>" + json.show.name + "</b> (" 
    + json.show.started + ")");
  
  //then make another ajax call for the episodes for that particular show.
  $.ajax({
    url: 'http://www.jbuckland.com/ketchup.php?func=show&query='
    + json.show.showid,
    dataType: "json",
    type: 'GET',
    success: function(kson) {
      processKson(json, kson, shows);
    }
  });
}

//kson is the second level of data
//the response to the show query
function processKson(json, kson, shows){
  //if there aren't any episodes in the database, don't add the show
  if (typeof kson.Episodelist == 'undefined'){
    pushAlert("No episodes in the database :( Sorry!");
    $('#AddShowTitle').val(''); //empty the input div
    $('#addingShow').hide();
    return;
  }

  //merge json and kson
  json.show.episodes = kson.Episodelist;

  //now we create a Show object from the JSON
  //all episodes unseen by default
  var newShow = createObject(json);
  // console.log(newShow);

  //open the modal to ask for options
  openProgressModal(json.show.name);

  //seen it all
  $('#seen-it-all').mouseup(function(){
    newShow = markAllEpisodesSeen(newShow);
    closeProgressModal(true, newShow, shows);
  });

  //a few behind
  $('#a-few-behind').mouseup(function(){
    transitionToSpecificModal(); //open the advanced options  
    newShow = markAllEpisodesSeen(newShow); //mark all episodes as watched
    //for every season of the show,
    for (var j = 0; j < newShow.seasons.length; j++){
      //for every episode in the season,
      for (var k = 0; k < newShow.seasons[j].episodes.length; k++){
        //print a button for it
        $('#progress-options-specific').prepend(
          newShow.seasons[j].episodes[k].print('specific')
        );
      }
    }

    $('#progress-options-specific a').click(function(){
      var j = $(this).attr('j');
      var k = $(this).attr('k');

      var currentcolor = decideColor(newShow.seasons[j].episodes[k]);
      //if it's not aired yet, nothing happens
      if (currentcolor == 'grey'){
        return;
      } else {
        //if it's unseen, mark it seen. if it's seen, mark it unseen
        $(this).toggleClass('green red');
        $(this).children('i').toggleClass(
          'mdi-toggle-check-box-outline-blank mdi-toggle-check-box'
          );
        newShow.seasons[j].episodes[k].seen ^= true;
      }

    });

    $('#a-few-behind').unbind(); //to prevent double clicks
    $('#looks-right').click(function(){
      closeProgressModal(true, newShow, shows);
      // console.log('looks right' + (Date.now() / 1000 | 0));
    });

  });

  //from scratch
  $('#from-scratch').mouseup(function(){
    closeProgressModal(true, newShow, shows);
  });
}

function createObject(json){
  // console.log(json);
  
  //if Season isn't an Array,
  if (!(json.show.episodes.Season instanceof Array)){
    //then make a Season array anyway and push the lone season to it
    // console.log("Processing a show with only one season");
    var tmp = json.show.episodes.Season;
    json.show.episodes.Season = [];
    json.show.episodes.Season.push(tmp);
  }

  var newShow = new Show ();
  newShow.classification  = json.show.classification;
  newShow.country         = json.show.country;
  newShow.ended           = json.show.ended;
  newShow.name            = json.show.name;
  newShow.lastUpdated     = Date.today();
  newShow.showid          = json.show.showid;
  newShow.started         = json.show.started;
  newShow.status          = json.show.status;
  for (var i in json.show.genres.genre){
    newShow.genres.push(json.show.genres.genre[i]);
  }
  for (var i in json.show.episodes.Season){
    var newSeason = new Season ();
    newSeason.number = (parseInt(i)+1).toString();
    for (var j in json.show.episodes.Season[i].episode){
      var newEpisode = new Episode();
      newEpisode.airdate    = valiDate(
		  json.show.episodes.Season[i].episode[j].airdate
	  );
      newEpisode.epnum      = j;
      newEpisode.link       = json.show.episodes.Season[i].episode[j].link;
      newEpisode.seen       = false;

      newEpisode.name       = json.show.episodes.Season[i].episode[j].title;

      newEpisode.showid     = json.show.showid;
      newEpisode.showname   = json.show.name;

      newEpisode.seasonnum_human = newSeason.number;
      newEpisode.seasonnum_computer = i;
      newEpisode.episodenum_human = json.show.episodes.Season[i].episode[j].seasonnum;
      newEpisode.episodenum_computer = j;

      newSeason.episodes.push(newEpisode);
    }
    newShow.seasons.push(newSeason);
  }
  return newShow;
}

//opens the defaultprogress modal and empties it
function openProgressModal(name){
  $('#progress-modal').openModal();
  $('#progress-modal').removeClass('modal-fixed-footer');
  $('#progress-modal .modal-content h4').empty()
  .append("<i class='mdi-av-my-library-add left'></i>Adding " + name);
  $('#progress-modal .modal-content h5').empty().html("I'm...");
  $('#progress-options').show();
  $('#progress-options-specific').empty().hide();
  $('#progress-modal .modal-footer').hide();

  $("html").keyup(function(event){
    if(event.keyCode == 27){ 
      closeProgressModal(false);
    }
  });
}

//closes the progress modal and pushes the new show onto the stack
function closeProgressModal(success, newShow, shows){
  if(success){
    //push it to the shows array
    shows.push(newShow);
    // and update everything dependent upon the shows array
    writeToLocalStorage(shows); 
    // has to be done independently, on-screen
    updateEdit(shows);     
    //push alert
    pushAlert("Added \"" + newShow.name + "\" (" + newShow.started + ")"); 
  }
  $('#AddShowTitle').val(''); //empty the input div
  $('#searchUpdates').hide();
  $('#AddShowTitle').focus(); //empty the input div
  $("html").unbind();
}

//shows the specific progress modal
function transitionToSpecificModal(){
  $('#progress-options').hide();
  $('#progress-options-specific').empty().show();
  $('#progress-modal .modal-content h5').html(
    "Deselect the episodes you've missed. <br/>\
    <small>You can always edit this later in the <b>Dashboard</b>.</small>"
	);
  $('#progress-modal .modal-footer').show();
  $('#progress-modal').addClass('modal-fixed-footer');
}

//marks all episodes in a season as seen
function markAllEpisodesSeen(newShow){
  //for every season of the show,
  for (var i in newShow.seasons){

    //...for every episode of a season,
    for (var j in newShow.seasons[i].episodes){

      //has it aired yet?
      var compare = Date.today().compareTo(
        Date.parse(
          newShow.seasons[i].episodes[j].airdate
          )
        );
      // console.log(compare);
      
      //if it's aired and you've seen it all
      if (compare >= "0"){
        newShow.seasons[i].episodes[j].seen = true;
      } else {
        //either it hasn't aired or you haven't seen it all, either way:
        newShow.seasons[i].episodes[j].seen = false;
      }
    }
  }
  return newShow;
}

function valiDate(date){
  if (date == "0000-00-00" || Date.parse(date) == null || date == null){
    return "3000-01-01";
  } else {
    return date;
  }
}

//how to erase a specific show
function deleteShowPrompt(code, name){
  var shows = virtualShows;
  $('#confirm-delete-modal').openModal();
  $('#confirm-delete-button').click(function(){
    deleteShowConfirm(code, shows);
  });
  $("html").keydown(function(event){
    if(event.keyCode == 13){ 
      deleteShowConfirm(code, shows);
    }
  });
  $("html").keydown(function(event){
    if(event.keyCode == 27){   
      deleteShowEscape(name);
    }
  });
  $('#cancel-delete-button').click(function(){
    deleteShowEscape(name);
  });
}

function deleteShowConfirm(code, shows){
  var name;
  for (var i in shows){
    if(shows[i].showid == code){
      name = shows[i].name;
      shows.splice(i,1);
    }
  }
  writeToLocalStorage(shows);
  updateEdit(shows);
  pushAlert(name + ' was deleted!');
  $('#confirm-delete-modal').closeModal();
  $('html').unbind();
}

function deleteShowEscape(name){
  pushAlert(name + ' was not deleted! :)');
  $('html').unbind();
}

//how do reset all your shows
function resetShows(shows){
  // console.log(code);
  $('#confirm-reset-modal').openModal();
  $('#confirm-reset-button').click(function(){
    shows = [];
    writeToLocalStorage(shows);
    updateEdit(shows);
    pushAlert('All progress was deleted!');
  });
  $('#cancel-reset-button').click(function(){
    pushAlert('Reset cancelled :)');
  });
}

//            _                _            
//   ___ __ _| | ___ _ __   __| | __ _ _ __ 
//  / __/ _` | |/ _ \ '_ \ / _` |/ _` | '__|
// | (_| (_| | |  __/ | | | (_| | (_| | |   
//  \___\__,_|_|\___|_| |_|\__,_|\__,_|_|   
// functions for specifically rendering the calendar

//weird SE function to figure out date difference in days
function dateDiffInDays(a, b) {
  // Discard the time and time-zone information.
  var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

//      _           _     _                         _ 
//   __| | __ _ ___| |__ | |__   ___   __ _ _ __ __| |
//  / _` |/ _` / __| '_ \| '_ \ / _ \ / _` | '__/ _` |
// | (_| | (_| \__ \ | | | |_) | (_) | (_| | | | (_| |
//  \__,_|\__,_|___/_| |_|_.__/ \___/ \__,_|_|  \__,_|

//when you click a row in the dashboard,
//it checks to see if it's already been rendered
//and runs renderDashRow() if it hasn't
function openDashRow(obj, shows){
  var i = obj.attr('i');  
  if (dashRendered[i]){ //if it's already been rendered
    // console.log('NOT rendering a row');
    $('ul.tabs#tabs'+obj.attr('showid')).tabs(); //just initialize tabs
    // return;
  } else { //if it's not been rendered before,
    dashRendered[i] = true; //mark it as rendered
    renderDashRow(obj, shows); //render that particular row
    $('ul.tabs#tabs'+obj.attr('id')).tabs(); //initialize local tabs
    //refresh click function for links a.ep
    $('a.ep').click(function(){
      toggleShow($(this), shows)
    });
  }
}

//draws a particlar row in the dashboard
function renderDashRow(obj, shows){

  var i = obj.attr('i');
  // make sure it's real, and then...
  if(typeof shows[i] != 'undefined'){
    //for every season of the show,
    for (var j = 0; j < shows[i].seasons.length; j++){
      //tell me the real season number
      var seasonnumber = shows[i].seasons[j].number;
      var seasonlength = shows[i].seasons.length;
      //and create a tab with that name
      $("#tabs" + shows[i].showid).append(
	    '<li class="tab col s3"><a href="#w'
        + shows[i].showid + 's' + seasonnumber + '">S' + seasonnumber 
        + '</a></li>'
	  );
      if (seasonnumber == seasonlength){
        $("a[href='#w"+shows[i].showid+"s"+seasonnumber+"']")
        .addClass("active");
      }
      //then create the content area for that tab.
      $("#w" + shows[i].showid).append(
        '<div id = "w'+shows[i].showid+'s'+seasonnumber+'" class="col s12">'
        + '<div class="container epsContainer"></div>'
        + '</div>'
      );
      //then, for every episode in the season,
      for (var k = 0; k < shows[i].seasons[j].episodes.length; k++){
        // console.log('show' + i + 'season' + j + 'episode' + k);
        //tell me the real episode number
        var episodenumber = shows[i].seasons[j].episodes[k].episodenum_human;
        //determine the color,
        var color = decideColor(shows[i].seasons[j].episodes[k]);
        //the icon,
        var isChecked = decideIcon(color);
        
        //and write a little button block for that episode.
        $("#w" + shows[i].showid + "s" + seasonnumber + " .container")
        .append(
          '<a class="waves-effect '+color+' lighten-1 white-text btn-flat ep" '
          + 'i="'+i+'" j="'+j+'" k="'+k+'">'
          + '<i class="' + isChecked + ' left"> </i>'
          + '<b class="left">'
          + shows[i].seasons[j].episodes[k].seasonnum_human 
		  + "x" + shows[i].seasons[j].episodes[k].episodenum_human
          + '</b> &nbsp;'
          + shows[i].seasons[j].episodes[k].name
          + '</a>'
          );
      }
    }
  }
}

//      _        _             
//  ___| |_ _ __(_)_ __   __ _ 
// / __| __| '__| | '_ \ / _` |
// \__ \ |_| |  | | | | | (_| |
// |___/\__|_|  |_|_| |_|\__, |
//                       |___/ 

//converts a show to Title Case
// like the python funciton str.Title().
function toTitleCase(str) {
  return str.replace(
    /\w\S*/g, 
    function(txt){
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
    );
}

//creates an abbreviation from a show name
function abbrev(str){
  if (/\s/.test(str)){
    return str.match(/\b(\w)/g).join('');
    // return str
  } else {
    return str.replace(/[aeiou]/ig,'').replace(/(.)(?=.*\1)/g, "");
  }
}

//pushes an alert to the box in the corner
function pushAlert(str){
  Materialize.toast(str, 3000);
}

//pushes an alert to the box in the corner
function pushSearchUpdate(str){
  $('#letemknow').html(str);
}

//      _                             
//  ___| |_ ___  _ __ __ _  __ _  ___ 
// / __| __/ _ \| '__/ _` |/ _` |/ _ \
// \__ \ || (_) | | | (_| | (_| |  __/
// |___/\__\___/|_|  \__,_|\__, |\___|
//                         |___/      

//check for localStorage
function syncStorage(){
  //if we can, recall `shows` from memory
  if (typeof localStorage.shows != "undefined" && localStorage.shows != []){  
    // console.log(localStorage.shows);
    return JSON.parse(localStorage.shows);
  } else { //if localStorage.shows is empty, we're new
    localStorage.shows = []; //make an empty, write it to storage
    return []; //and return it 
    //This has to be an array we return, not localStorage.shows. 
    //We could return JSON.parse(localStorage.shows if we wanted, though.
  }
}

//updates the shows. 
function writeToLocalStorage(shows){
  // console.log("Running writeToLocalStorage");
  localStorage.shows = JSON.stringify(shows);
  // console.log(shows);
}

//if the browser doesn't have HTML5 storage,
//let em know
function checkBrowser(){
  if(typeof(Storage) !== "undefined") { //if it is, we're all good
    $('.alert').append('Code for localStorage/sessionStorage.'); 
  } else { 
    //otherwise, we're not all good.
    pushAlert('<Sorry! Your browser doesn\'t support HTML5 Web Storage.');
    pushAlert('This app almost definitely won\'t work.');
    pushAlert('<br/>Upgrade to a <a href="http://outdatedbrowser.com/">modern browser</a>.');
  }
}
