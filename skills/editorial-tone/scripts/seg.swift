import Vision; import AppKit
let a=CommandLine.arguments; let url=URL(fileURLWithPath:a[1])
let req=VNGeneratePersonSegmentationRequest(); req.qualityLevel = .accurate
let h=VNImageRequestHandler(url:url, options:[:]); try! h.perform([req])
let pb=req.results!.first!.pixelBuffer; let ci=CIImage(cvPixelBuffer:pb)
let rep=NSBitmapImageRep(ciImage:ci); try! rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:a[2]))
