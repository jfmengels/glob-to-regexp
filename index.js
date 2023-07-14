module.exports = function (glob, opts) {
  if (typeof glob !== 'string') {
    throw new TypeError('Expected a string');
  }

  var str = String(glob);

  // If we are doing extended matching, this boolean is true when we are inside
  // a group (eg {*.html,*.js}), and false otherwise.
  var inGroup = false;

  // RegExp flags (eg "i" ) to pass in to RegExp constructor.
  var flags = opts && typeof( opts.flags ) === "string" ? opts.flags : "";

  var reStr = help(str, 0, "", inGroup)

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};

function help(str, i, reStr, inGroup) {
  var c = str[i];
  if (c === undefined) {
    return reStr;
  }

  switch (c) {
  case "/":
  case "$":
  case "^":
  case "+":
  case ".":
  case "(":
  case ")":
  case "=":
  case "!":
  case "|":
    reStr += "\\" + c;
    return help(str, i + 1, reStr, inGroup);

  case "?":
    reStr += ".";
    return help(str, i + 1, reStr, inGroup);

  case "{":
      inGroup = true;
      reStr += "(";
      return help(str, i + 1, reStr, inGroup);

  case "}":
      inGroup = false;
      reStr += ")";
      return help(str, i + 1, reStr, inGroup);

  case ",":
    if (inGroup) {
      reStr += "|";
      return help(str, i + 1, reStr, inGroup);
    }
    reStr += "\\" + c;
    return help(str, i + 1, reStr, inGroup);

  case "*":
    // Move over all consecutive "*"'s.
    // Also store the previous and next characters
    var prevChar = str[i - 1];
    var hasMultipleStars = false;
    while(str[i + 1] === "*") {
      hasMultipleStars = true;
      i++;
    }
    var nextChar = str[i + 1];

    // determine if this is a globstar segment
    var isGlobstar = hasMultipleStars                   // multiple "*"'s
      && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
      && (nextChar === "/" || nextChar === undefined)   // to the end of the segment

    if (isGlobstar) {
      // it's a globstar, so match zero or more path segments
      reStr += "((?:[^/]*(?:\/|$))*)";
      i++; // move over the "/"
    } else {
      // it's not a globstar, so only match one path segment
      reStr += "([^/]*)";
    }
    return help(str, i + 1, reStr, inGroup);

  default:
    reStr += c;
    return help(str, i + 1, reStr, inGroup);
  }
}