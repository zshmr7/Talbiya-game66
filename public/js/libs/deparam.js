/**
 * jQuery.deparam - The opposite of jQuery param. Parses a query string into an object.
 *
 * Credits for the idea and Regex:
 * http://stevenbenner.com/2010/03/javascript-regex-trick-parse-a-query-string-into-an-object/
 */
(function($){
  $.deparam = $.deparam || function(uri){
    if(uri === undefined){
      uri = window.location.search;
    }
    var queryString = {};
    uri.replace(
      new RegExp("([^?=&]+)(=([^&#]*))?", "g"),
      function($0, $1, $2, $3) {
        queryString[$1] = $3 ? decodeURIComponent($3.replace(/\+/g, '%20')) : "";
      }
    );
    return queryString;
  };
})(jQuery);
