Set WshShell = CreateObject("WScript.Shell")
Dim projectPath
projectPath = "C:\Users\ADMIN\Desktop\graduate\job-hunt-sample"

WshShell.Run "cmd /c node " & Chr(34) & projectPath & "\server\shukatsu-api.js" & Chr(34), 0, False
WScript.Sleep 1000
WshShell.Run "cmd /c node " & Chr(34) & projectPath & "\server\email-server.js" & Chr(34), 0, False
WScript.Sleep 1000
WshShell.Run "cmd /c node " & Chr(34) & projectPath & "\node_modules\vite\bin\vite.js" & Chr(34) & " --cwd " & Chr(34) & projectPath & Chr(34), 0, False
