var filters = [
  // RegEx match against the raw contents of the email
  // { name: 'user emails', match: /deliveredto:user@domain.com/, star: true }, // star emails deliveredto user@domain.com
  
  // use a RegEx selector (.+?) to set the label name
  // { match: /(?:List-ID:\s(.+?)\s<)/, archive: true }, // organize by list name

  // use the subject shortcut to check the subject for text
  // { name: 'finance', subject: 'bank', markRead: true }, // label all emails with "bank" in the subject as "finance" and mark as read

];

var from = [
  // "from:email@domain.com",
  // "list:subscription.domain.com"
];

function labeler() {

  var batchSize = 50;
  var labelCache = {};
  var query = "in:inbox has:nouserlabels AND (" + from.join(' OR ') + ")";
  var threads = GmailApp.search(query, 0, batchSize);
  GmailApp.getMessagesForThreads(threads);

  var findOrCreateLabel = function(name) {
    if (labelCache[name] === undefined) {
      labelCache[name] = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
    }
    return labelCache[name];
  }

  var applyLabel = function(name, thread){
    var label = null;
    var labelName = "";

    // create nested labels by parsing "/"
    name.split('/').forEach(function(labelPart, i) {
      labelName = labelName + (i===0 ? "" : "/") + labelPart.trim();
      label = findOrCreateLabel(labelName);
    });

    thread.addLabel(label);
  }

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    if (messages == null) return; // nothing to do

    var message = messages[messages.length - 1]; // most recent message
    var body = message.getRawContent();
    var archive = true;

    filters.forEach(function(filter){

      // shortcuts
      if (filter.subject) filter.match = new RegExp('Subject:.*?' + filter.subject, 'i');

      var matches = filter.match.exec(body);
      if (matches !== null) {

        // label will be regex match or name provided
        var label = filter.name || matches[1];
        if (label !== undefined) applyLabel(label, thread);

        // toggle flags
        if (filter.star) message.star();
        if (filter.markRead) message.markRead();

        // prevent archive if filter explicitly sets "archive" to false (if "archive" is not defined, continue)
        if (filter.archive !== undefined && !filter.archive) archive = false;
      }
    });

    if (archive) thread.moveToArchive();
  });
}
