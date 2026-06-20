


# # set the working-dir to this directory
# Set-Location -Path $PSScriptRoot
# 
# cd packages/@orgavcfw/otstudioe2

Push-Location (Join-Path -Path $PSScriptRoot -ChildPath "packages/@orgavcfw/otstudioe2" )
try {

  npm run dev

} finally {
Pop-Location
}




