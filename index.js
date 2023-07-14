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

  var reStr = help(str.split(""), 0, "", inGroup, true)

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};

function help(str, i, reStr, inGroup, isAtTheStartOfSegment) {
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
    return help(str.slice(1), 0, reStr + "\\/", inGroup, true);

  case "$":
  case "^":
  case "+":
  case ".":
  case "(":
  case ")":
  case "=":
  case "!":
  case "|":
    return help(str.slice(1), 0, reStr + "\\" + c, inGroup, false);

  case "?":
    return help(str, 1, reStr + ".", inGroup, false);

  case "{":
      return help(str, 1, reStr + "(", true, false);

  case "}":
      return help(str, 1, reStr + ")", false, false);

  case ",":
    if (inGroup) {
      return help(str, 1, reStr + "|", inGroup, false);
    }
    return help(str, 1, reStr + "\\" + c, inGroup, c);

  case "*":
    var {hasMultipleStars, newStr} = moveOverConsectutiveStars(str);
    // Move over all consecutive "*"'s.
    // Also store the previous and next characters
    var nextChar = newStr[1];

    if (hasMultipleStars && isAtTheStartOfSegment) {
      if (nextChar === undefined) {
        return reStr + starStarReplacement;
      }
      else if (nextChar === "/") {
        return help(newStr.slice(2), 0, reStr + starStarReplacement, inGroup, true);
      }
      else {
        // it's not a globstar, so only match one path segment
        return help(newStr.slice(1), 0, reStr + "([^/]*)", inGroup, false);
      }
    } else {
      // it's not a globstar, so only match one path segment
      return help(newStr, 1, reStr + "([^/]*)", inGroup, false);
    }

  default:
    return help(str, 1, reStr + c, inGroup, false);
  }
}

const starStarReplacement = "((?:[^/]*(?:\/|$))*)";

function moveOverConsectutiveStars(str) {
  var hasMultipleStars = false;
  var i = 0;
  while(str[i + 1] === "*") {
    hasMultipleStars = true;
    i++;
  }
  return { hasMultipleStars, newStr: str.slice(i) };
}