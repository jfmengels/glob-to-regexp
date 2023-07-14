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

  var reStr = help(str.split(""), 0, "", inGroup, undefined)

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};

function help(str, i, reStr, inGroup, prevChar) {
  if (str.length === 0) {
    return undefined;
  }
  str = str.slice(i);
  i = 0;

  var c = str[i];
  if (c === undefined) {
    return reStr;
  }

  switch (c) {
  case "/":
    return help(str, 1, reStr + "\\/", inGroup, c);

  case "$":
  case "^":
  case "+":
  case ".":
  case "(":
  case ")":
  case "=":
  case "!":
  case "|":
    return help(str, 1, reStr + "\\" + c, inGroup, c);

  case "?":
    return help(str, 1, reStr + ".", inGroup, c);

  case "{":
      return help(str, 1, reStr + "(", true, c);

  case "}":
      return help(str, 1, reStr + ")", false, c);

  case ",":
    if (inGroup) {
      return help(str, 1, reStr + "|", inGroup, c);
    }
    return help(str, 1, reStr + "\\" + c, inGroup, c);

  case "*":
    var {newI, hasMultipleStars, newStr} = moveOverConsectutiveStars(str);
    // Move over all consecutive "*"'s.
    // Also store the previous and next characters
    var nextChar = str[newI + 1];

    // determine if this is a globstar segment
    var isGlobstar = hasMultipleStars                   // multiple "*"'s
      && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
      && (nextChar === "/" || nextChar === undefined)   // to the end of the segment

    if (isGlobstar) {
      // reStr: it's a globstar, so match zero or more path segments
      // newI: move over the "/"
      return help(str, newI + 2, reStr + "((?:[^/]*(?:\/|$))*)", inGroup, nextChar);
    } else {
      // it's not a globstar, so only match one path segment
      return help(str, newI + 1, reStr + "([^/]*)", inGroup, str[i]);
    }

  default:
    return help(str, 1, reStr + c, inGroup, c);
  }
}

function moveOverConsectutiveStars(str) {
  var hasMultipleStars = false;
  var i = 0;
  while(str[i + 1] === "*") {
    hasMultipleStars = true;
    i++;
  }
  return { newI: i, hasMultipleStars, newStr: str.slice(i) };
}