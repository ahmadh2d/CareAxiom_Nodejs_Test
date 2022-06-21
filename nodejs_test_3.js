/*
 * Task 3: Implement the above using Promises.
 */

// import required libraries
import { createServer } from "http";
import { get } from "https";
import { parse } from "url";
import { readFileSync, readFile } from "fs";

const serverPort = 8080;
const urlPathname = "/I/want/title";
const notFoundFilePath = "./html/page-not-found.html";
const titlesFilePath = "./html/display-website-titles.html";
const urlRegex = /^(https?\:\/\/)?(www\.)?([\w|\d|\-]*\.)(\w+)([\\\/][\w\d\-]*)*(\?[\w\d\=\&\-\_\+\%]*)*$/g;

const getSiteData = (siteURL) => {
    return new Promise((resolve) => {
        try {
            siteURL = siteURL.replace(urlRegex, "https://www.$3$4$5$6");
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
                    resolve(`${siteURL} - NO RESPONSE`);
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
                        resolve(`${siteURL} title is: ${pageTitle}`);
                    } catch (e) {
                        console.error(e.message);
                        resolve(`${siteURL} - NO RESPONSE`);
                    }
                });
            }).on("error", (e) => {
                console.error(`Got error: ${e.message}`);
                resolve(`${siteURL} - NO RESPONSE`);
            });
        } catch (error) {
            console.error(error.message);
            resolve(`${siteURL} - NO RESPONSE`);
        }
    });
}

createServer((req_server, res_server) => {

    const url_address = parse(req_server.url, true);
    if (url_address.pathname === urlPathname) {
        const query = url_address.query;

        // reading HTML file
        let htmlFileString = readFileSync(titlesFilePath, "utf8");

        let pageTitles = [];
        const urlAddresses = typeof query.address === "string" ? [query.address] : query.address;

        const siteRequests = urlAddresses.map(address => getSiteData(address));

        const loopAddresses = Promise.all(siteRequests).then((pageTitles) => {
            let stringReplaced = "";
            for (let pageTitle of pageTitles)
                stringReplaced += "<li>" + pageTitle + "</li>";
    
            htmlFileString = htmlFileString.replace("{{}}", stringReplaced);
            res_server.writeHead(200, { "Content-Type": "text/html" });
            res_server.write(htmlFileString);
            return res_server.end();
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
