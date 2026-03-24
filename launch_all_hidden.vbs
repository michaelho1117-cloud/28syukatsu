Set WshShell = CreateObject("WScript.Shell")
Dim projectPath, npmPath
projectPath = "C:\Users\ADMIN\Desktop\graduate"
npmPath = "C:\Program Files\nodejs\npm.cmd"

' Start core API
WshShell.Run "cmd /c cd /d " & Chr(34) & projectPath & Chr(34) & " && " & Chr(34) & npmPath & Chr(34) & " run api:core", 0, False
WScript.Sleep 1200

' Start email API
WshShell.Run "cmd /c cd /d " & Chr(34) & projectPath & Chr(34) & " && " & Chr(34) & npmPath & Chr(34) & " run api", 0, False
WScript.Sleep 1200

' Start frontend
WshShell.Run "cmd /c cd /d " & Chr(34) & projectPath & Chr(34) & " && " & Chr(34) & npmPath & Chr(34) & " run dev -- --host 127.0.0.1 --port 5173", 0, False
WScript.Sleep 3500

' Open browser
WshShell.Run "http://localhost:5173/"
