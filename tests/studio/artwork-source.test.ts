import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appleId,
  appleLookup,
  artworkSource,
  oEmbed,
  providerOf,
  upgradeAppleArtwork,
  youtubeId,
} from "../../src/lib/artwork-source";
import { releases } from "../../src/content/releases";

/**
 * The artwork pipeline is the one place where a wrong URL silently produces a wrong cover, so the
 * mapping from "the link the owner published" to "the endpoint that returns its art" is pinned here.
 * Nothing in this file touches the network.
 */

describe("artwork source resolution", () => {
  it("recognises the four platforms the catalogue actually uses", () => {
    assert.equal(providerOf("https://music.apple.com/id/album/masih-dihatiku-single/1816312737"), "apple");
    assert.equal(providerOf("https://open.spotify.com/intl-id/track/32xyWKqnleBI5U56jvnGUa"), "spotify");
    assert.equal(providerOf("https://soundcloud.com/akbarnawasunda/kamu-nanyeak"), "soundcloud");
    assert.equal(providerOf("https://youtu.be/dQw4w9WgXcQ"), "youtube");
    assert.equal(providerOf("https://www.instagram.com/akbarnawasunda/"), null);
  });

  it("pulls Apple's numeric id out of album and song URLs", () => {
    assert.equal(appleId("https://music.apple.com/id/album/masih-dihatiku-single/1816312737"), "1816312737");
    assert.equal(
      appleId("https://music.apple.com/id/song/pada-imut-aisyah-tak-belagu/1868511241?l=id"),
      "1868511241",
    );
    assert.equal(appleId("https://music.apple.com/id/album/no-id-here"), null);
  });

  it("builds the lookup and oEmbed endpoints", () => {
    assert.equal(
      appleLookup("1816312737"),
      "https://itunes.apple.com/lookup?id=1816312737&entity=song&country=id",
    );
    assert.match(oEmbed("soundcloud", "https://soundcloud.com/a/b"), /^https:\/\/soundcloud\.com\/oembed\?/);
    assert.match(oEmbed("spotify", "https://open.spotify.com/track/x"), /thumbnail|oembed/);
    assert.match(oEmbed("youtube", "https://youtu.be/dQw4w9WgXcQ"), /youtube\.com\/oembed/);
  });

  it("asks Apple for a print-sized copy instead of 100x100", () => {
    assert.equal(
      upgradeAppleArtwork("https://is1-ssl.mzstatic.com/image/thumb/Music/ab/cd/100x100bb.jpg", 1400),
      "https://is1-ssl.mzstatic.com/image/thumb/Music/ab/cd/1400x1400bb.jpg",
    );
  });

  it("finds the YouTube id in the three shapes YouTube uses", () => {
    assert.equal(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  it("prefers Apple, then SoundCloud, then Spotify, then YouTube", () => {
    const source = artworkSource([
      { label: "Instagram", href: "https://instagram.com/x" },
      { label: "Spotify", href: "https://open.spotify.com/track/abc" },
      { label: "SoundCloud", href: "https://soundcloud.com/x/y" },
      { label: "Apple Music", href: "https://music.apple.com/id/album/x/123456" },
    ]);
    assert.equal(source?.provider, "apple");
    assert.equal(source?.id, "123456");
  });

  it("returns null when nothing in the list can yield artwork", () => {
    assert.equal(artworkSource([]), null);
    assert.equal(artworkSource([{ label: "Instagram", href: "https://instagram.com/x" }]), null);
  });

  it("resolves a source for most of the real catalogue", () => {
    const resolved = releases.filter((release) => artworkSource(release.links) !== null);
    assert.ok(resolved.length >= 5, `only ${resolved.length} releases could resolve artwork`);
    // And every link that *does* resolve must produce a usable endpoint, not just a provider tag.
    for (const release of resolved) {
      const source = artworkSource(release.links);
      assert.match(source!.endpoint, /^https:\/\//, `${release.slug} produced a non-https endpoint`);
    }
  });
});
