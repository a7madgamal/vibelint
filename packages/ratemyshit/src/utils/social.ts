export function generateSocialMessage(score: number): string {
  const roundedScore = Math.round(score)

  if (roundedScore >= 95) {
    return `Just got my code rated: ${roundedScore}% 🎯 My project is... actually decent? I'm as shocked as you are. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 90) {
    return `Just got my code rated: ${roundedScore}% 🎯 Not terrible, I guess? Still waiting for the other shoe to drop. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 80) {
    return `Just got my code rated: ${roundedScore}% 🎯 It works, I think? Don't look too closely. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 70) {
    return `Just got my code rated: ${roundedScore}% 🎯 Yikes. This is... functional? Barely. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 60) {
    return `Just got my code rated: ${roundedScore}% 🎯 Well, it compiles. That's something, right? Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 50) {
    return `Just got my code rated: ${roundedScore}% 🎯 At least it's not on fire? Yet. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 40) {
    return `Just got my code rated: ${roundedScore}% 🎯 Oh no. Oh no no no. What even is this? Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 30) {
    return `Just got my code rated: ${roundedScore}% 🎯 I'm calling the police. This is a crime scene. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 20) {
    return `Just got my code rated: ${roundedScore}% 🎯 This should be illegal. Seriously, who let this happen? Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  if (roundedScore >= 10) {
    return `Just got my code rated: ${roundedScore}% 🎯 I don't even know where to start. This is a disaster. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
  }
  return `Just got my code rated: ${roundedScore}% 🎯 I'm speechless. This is beyond help. Run npx ratemyshit in your projects to find out, if you dare #ratemyshit`
}
