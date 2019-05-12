import * as functions from 'firebase-functions';
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: functions.config().weeklyarchive.client_id,
    clientSecret: functions.config().weeklyarchive.client_secret,
    redirectUri: functions.config().weeklyarchive.redirect_url
});

spotifyApi.setRefreshToken(functions.config().weeklyarchive.refresh_token);

exports.weeklyArchive = functions.pubsub.schedule('every 12 hours').onRun((context) => {
    spotifyApi.refreshAccessToken()
    .then(function(accessTokenData: any) {
        console.log('The access token has been refreshed!');
        spotifyApi.setAccessToken(accessTokenData.body['access_token']);
        
        spotifyApi.getPlaylist(functions.config().weeklyarchive.origin_playlist)
        .then(function(data: any) {
            // TODO: check for empty playlist
            if (!data.body.tracks.items) {
                console.log(data.body);
                return;
            }
            spotifyApi.getPlaylist(functions.config().weeklyarchive.destination_playlist)
            .then(function(destinationData: any) {
                const existingUris: string[] = [];
                if (destinationData.body.tracks.items) {
                    for (const item of destinationData.body.tracks.items) {
                        const uri = item.track.uri;
                        existingUris.push(uri);
                    }
                }
                
                const uris: string[] = [];
                if (data.body.tracks.items) {
                    for (const item of data.body.tracks.items) {
                        const uri = item.track.uri;
                        if (!existingUris.includes(uri)) {
                            uris.push(uri);
                        }
                    }
                }
                
                spotifyApi.addTracksToPlaylist(functions.config().weeklyarchive.destination_playlist, uris, { position: 0 })
                .then(function(addedData: any) {
                    console.log('Added tracks to playlist!');
                }, function(error: any) {
                    console.log('Something went wrong while adding tracks!', error);
                });
            }, function(error: any) {
                console.log('Something went wrong while fetching destination!', error);
            });
        }, function(error: any) {
            console.log('Something went wrong while fetching origin!', error);
        });
        
    }, function(error: any) {
        console.log('Could not refresh access token', error);
    });
});
