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

  var reStr = help(str.split(""), "", inGroup, true)

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};

function help(str, reStr, inGroup, isAtTheStartOfSegment) {
  if (str.length === 0) {
    return reStr;
  }

  var c = str[0];
  if (c === undefined) {
    return reStr;
  }

  switch (c) {
  case "/":
    return help(str.slice(1), reStr + "\\/", inGroup, true);

  case "$":
  case "^":
  case "+":
  case ".":
  case "(":
  case ")":
  case "=":
  case "!":
  case "|":
    return help(str.slice(1), reStr + "\\" + c, inGroup, false);

  case "?":
    return help(str.slice(1), reStr + ".", inGroup, false);

  case "{":
    return help(str.slice(1), reStr + "(", true, false);

  case "}":
    return help(str.slice(1), reStr + ")", false, false);

  case ",":
    if (inGroup) {
      return help(str.slice(1), reStr + "|", inGroup, false);
    }
    return help(str.slice(1), reStr + "\\" + c, inGroup, c);

  case "*":
    var {hasMultipleStars, newStr} = moveOverConsecutiveStars(str);
    // Move over all consecutive "*"'s.
    // Also store the previous and next characters
    var nextChar = newStr[1];

    if (hasMultipleStars && isAtTheStartOfSegment) {
      if (nextChar === undefined) {
        return reStr + starStarReplacement;
      }
      else if (nextChar === "/") {
        return help(newStr.slice(2), reStr + starStarReplacement, inGroup, true);
      }
      else {
        // it's not a globstar, so only match one path segment
        return help(newStr.slice(1), reStr + "([^/]*)", inGroup, false);
      }
    } else {
      // it's not a globstar, so only match one path segment
      return help(newStr.slice(1), reStr + "([^/]*)", inGroup, false);
    }

  default:
    return help(str.slice(1), reStr + c, inGroup, false);
  }
}

const starStarReplacement = "((?:[^/]*(?:\/|$))*)";

function moveOverConsecutiveStars(str) {
  var hasMultipleStars = false;
  var i = 0;
  while(str[i + 1] === "*") {
    hasMultipleStars = true;
    i++;
  }
  return { hasMultipleStars, newStr: str.slice(i) };
}