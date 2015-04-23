_title = "fybr";

exports.uploadPOST = function(req, res, next) {
	req.session.seriesId = req.body.seriesId;
	console.log("Working: "+req.session.seriesId)
	res.send("{\"message\": \"Uploaded\")");
}