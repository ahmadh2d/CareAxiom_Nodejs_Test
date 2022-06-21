/*
 * Task 2: Implement the above using some kind of flow library e.g. async.js
 */

// import required libraries
import { createServer } from "http";
import { get } from "https";
import { forEachOfLimit } from "async";
import { parse } from "url";
import { readFileSync, readFile } from "fs";


// constants
const urlPathname = "/I/want/title";
const notFoundFilePath = "./html/page-not-found.html";
const titlesFilePath = "./html/display-website-titles.html";
const serverPort = 8080;
const urlRegex = /^(https?\:\/\/)?(www\.)?([\w|\d|\-]*\.)(\w+)([\\\/][\w\d\-]*)*(\?[\w\d\=\&\-\_\+\%]*)*$/g;

let pageTitles;

// get Website titles and put in an 'pageTitles' array
const getSiteData = (siteURL, index, done) => {
    try {
        siteURL = siteURL.replace(urlRegex, "https://www.$3$4$5$6");
        const parsedURL = parse(siteURL, true);
        get(siteURL, (response) => {
            const { statusCode } = response;

            let error;

            if (statusCode !== 200) {
                error = new Error(
                    siteURL + ": Request Failed. " + `Status Code: ${statusCode}`
                );
            }

            if (error) {
                console.error(error.message);
                // Consume response data to free up memory
                response.resume();
                pageTitles.push(`${siteURL} - NO RESPONSE`);
                done();
            }

            response.setEncoding("utf8");
            let rawData = "";
            response.on("data", (chunk) => {
                rawData += chunk;
            });
            response.on("end", () => {
                try {
                    const startTitleIndex = rawData?.search(/<title>/gi);
                    const endTitleIndex = rawData?.search(/<\/title>/gi);

                    const pageTitle = rawData?.substring(
                        startTitleIndex + 7,
                        endTitleIndex
                    );
                    console.log(`${siteURL} title is: ${pageTitle}`);
                    pageTitles.push(`${siteURL} title is: ${pageTitle}`);
                    done();
                } catch (e) {
                    console.error(e.message);
                    pageTitles.push(`${siteURL} - NO RESPONSE`);
                    done();
                }
            });
        }).on("error", (e) => {
            console.error(`Got error: ${e.message}`);
            pageTitles.push(`${siteURL} - NO RESPONSE`);
            done();
        });
    } catch (error) {
        console.error(error.message);
        pageTitles.push(`${siteURL} - NO RESPONSE`);
        done();
    }
}

// Creating Server and starting task
createServer((req_server, res_server) => {
    const url_address = parse(req_server.url, true);
    if (url_address.pathname === urlPathname) {
        const query = url_address.query;

        // reading HTML file
        let htmlFileString = readFileSync(titlesFilePath, "utf8");

        pageTitles = [];
        const urlAddresses = typeof query.address === "string" ? [query.address] : query.address;

        forEachOfLimit(urlAddresses, 4, (address, index, callback) => getSiteData(address, index, callback))
        .then(() => {
            let stringReplaced = "";
            for (let pageTitle of pageTitles)
                stringReplaced += "<li>" + pageTitle + "</li>";
    
            htmlFileString = htmlFileString.replace("{{}}", stringReplaced);
            res_server.writeHead(200, { "Content-Type": "text/html" });
            res_server.write(htmlFileString);
            return res_server.end();
        })
        .catch((err) => {
            console.error(err.message);
        });
    }
    else {
        res_server.writeHead(404, { "Content-Type": "text/html" });
        readFile(notFoundFilePath, (err, data) => {
            if (err) throw err;

            res_server.write(data);
            return res_server.end();
        });
    }
}).listen(serverPort);