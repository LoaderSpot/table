<div class="markdown-content">

<h1> <div align="center">FAQ</div> </h1>

<div class="faq">

  <div class="faq-item">
    <div class="question">Am I definitely downloading the official installer?</div>
    <div class="answer">
    Yes, direct links to Spotify's servers are used for the Windows and Mac builds. The Linux builds are stored in our separate GitHub repo, since they do not accumulate builds on their server
  
  </div>
  </div>

  <div class="faq-item">
    <div class="question">What is a TBZ file? How can I manually install a TBZ instead?</div>
    <div class="answer">
    TBZ is a Bzip2 compressed TAR file. Spotify packages their macOS desktop client updates in this format
    
    Steps for manual installation:
   - delete your current `Spotify.app/Contents/` directory, if a previous Spotify.app doesn't exist, create a `Spotify.app` directory/folder
   - extract the contents of the TBZ archive into your `Spotify.app` directory, this can all be done via GUI **|** browser/finder or CLI **|** terminal
  <blockquote data-type="warning">
    You can also use this <a href="https://github.com/jetfir3/TBZify" target="_blank">script</a> by <a href="https://github.com/jetfir3" target="_blank">jetfire</a> to make the installation process easier
  </blockquote>

  </div>
  </div>

  <div class="faq-item">
    <div class="question">Why can't I see new and some other versions for Linux?</div>
    <div class="answer">
    Linux builds are released with delays, and some versions may also be skipped. This is because compiling the Linux builds is handled by a limited number of developers

    Additionally, they only store a few recent Linux builds on their server, removing the oldest one when a new version is released. Therefore, I archive the builds as they come out in a GitHub repo to maintain access to older versions
  
  </div>
  </div>

</div>