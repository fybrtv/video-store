_title = "fybr";

exports.uploadPOST = function(req, res) {
	console.log("File upload starting...\n")
	if(done==true){
		console.log(req.files);
		res.end("File uploaded.");
	}
}